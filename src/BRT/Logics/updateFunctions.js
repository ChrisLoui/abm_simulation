import {
    getPositionOnPath,
    updateVehiclePositions
} from './utilitiFuntions';

/* ------------------------------ UPDATE FUNCTIONS ------------------------------ */

/**
 * Update vehicles (cars) based on deltaTime.
 */
/**
* Modified vehicle update function that integrates enhanced lane changing logic
*/
export const updateVehicles = (prevVehicles, buses, deltaTime, lanes) => {
    const updatedVehicles = [...prevVehicles];

    // First, identify all vehicles that are currently changing lanes
    const changingLaneVehicles = updatedVehicles.filter(v =>
        v.type === 'car' && v.laneChangeProgress < 1.0
    );

    // Create a map of vehicles that are changing into each lane
    const vehiclesChangingIntoLane = {};
    changingLaneVehicles.forEach(vehicle => {
        if (!vehiclesChangingIntoLane[vehicle.targetLane]) {
            vehiclesChangingIntoLane[vehicle.targetLane] = [];
        }
        vehiclesChangingIntoLane[vehicle.targetLane].push(vehicle);
    });

    // Group vehicles by their current lane and position
    const laneGroups = {};
    updatedVehicles.forEach(vehicle => {
        if (vehicle.type === 'car') {
            const laneKey = `${vehicle.lane}_${Math.floor(vehicle.pathPosition * 10)}`;
            if (!laneGroups[laneKey]) {
                laneGroups[laneKey] = [];
            }
            laneGroups[laneKey].push(vehicle);
        }
    });

    updatedVehicles.forEach(vehicle => {
        let shouldWait = false;
        let blockedAhead = false;
        let vehicleAheadDistance = 1.0;
        let vehicleBehindDistance = 1.0;
        let vehicleAhead = null;

        // Check if any vehicle is changing into this vehicle's lane
        if (vehiclesChangingIntoLane[vehicle.lane]) {
            vehiclesChangingIntoLane[vehicle.lane].forEach(changingVehicle => {
                // Calculate distance to the changing vehicle
                let dist = changingVehicle.pathPosition - vehicle.pathPosition;
                if (dist < 0) dist += 1;

                // If the changing vehicle is ahead and close, slow down
                if (dist > 0 && dist < 0.1) {
                    // Calculate deceleration based on distance and behavior
                    const decelerationFactor = vehicle.behaviorType === 'aggressive' ? 0.7 :
                        vehicle.behaviorType === 'neutral' ? 0.5 : 0.3;

                    // Apply deceleration
                    vehicle.speed = Math.max(0, vehicle.speed * (1 - decelerationFactor * (1 - dist / 0.1)));
                    shouldWait = true;
                }
            });
        }

        // Handle bus exit and passenger counting
        if (vehicle.type === 'bus' && vehicle.pathPosition > 0.95 && !vehicle.throughputCounted) {
            vehicle.throughputCounted = true;
            vehicle.throughput = vehicle.passengers || 0;
            vehicle.pathPosition = 0;
            vehicle.active = false;
            // Schedule reactivation
            setTimeout(() => {
                vehicle.active = true;
                vehicle.throughputCounted = false;
                vehicle.passengers = Math.floor(Math.random() * 21) + 70; // Reset passengers
            }, 10000); // 10 seconds delay
        }

        if (vehicle.laneChangeTimer > 0) {
            vehicle.laneChangeTimer -= deltaTime;
        }

        // Check if this vehicle is in a group with other vehicles
        const laneKey = `${vehicle.lane}_${Math.floor(vehicle.pathPosition * 10)}`;
        const groupVehicles = laneGroups[laneKey] || [];

        // If there are other vehicles in the same position group, coordinate lane changes
        if (groupVehicles.length > 1) {
            const changingInGroup = groupVehicles.filter(v => v.laneChangeProgress < 1.0);
            if (changingInGroup.length > 0) {
                // If another vehicle in the group is changing lanes, wait
                vehicle.laneChangeTimer = 1000;
            }
        }

        // Handle lane change progress
        if (vehicle.type === 'car' && vehicle.laneChangeProgress < 1.0) {
            const baseDuration = vehicle.laneChangeDuration;
            const progressChangePerMs = 1 / baseDuration;
            vehicle.laneChangeProgress -= progressChangePerMs * deltaTime;

            if (vehicle.laneChangeProgress <= 0) {
                vehicle.lane = vehicle.targetLane;
                vehicle.laneChangeProgress = 1.0;
                vehicle.laneChangeTimer = vehicle.laneChangeCooldown * (1 + Math.random() * 0.5);
            }
        }

        // Check vehicles ahead and behind in the same lane
        [...updatedVehicles, ...buses].forEach(otherVehicle => {
            if (vehicle !== otherVehicle && vehicle.lane === otherVehicle.lane && otherVehicle.active !== false) {
                let distAhead = otherVehicle.pathPosition - vehicle.pathPosition;
                if (distAhead < 0) distAhead += 1;

                // Check for vehicles ahead
                if (distAhead > 0 && distAhead < vehicleAheadDistance) {
                    vehicleAheadDistance = distAhead;
                    vehicleAhead = otherVehicle;
                }

                // Check for vehicles behind
                let distBehind = vehicle.pathPosition - otherVehicle.pathPosition;
                if (distBehind < 0) distBehind += 1;
                if (distBehind > 0 && distBehind < vehicleBehindDistance) {
                    vehicleBehindDistance = distBehind;
                }

                // Adjust detection distance based on behavior and speed
                const speedFactor = vehicle.speed / 3.0;
                const baseDetectionDistance = vehicle.behaviorType === 'aggressive' ? 0.06 :
                    vehicle.behaviorType === 'neutral' ? 0.05 : 0.04;
                const detectionDistance = baseDetectionDistance * (1 + speedFactor * 0.5);

                // Check for immediate collision risk
                if (distAhead > 0 && distAhead < detectionDistance) {
                    blockedAhead = true;
                    const safetyDistance = vehicle.behaviorType === 'aggressive' ? 0.02 :
                        vehicle.behaviorType === 'neutral' ? 0.025 : 0.03;
                    if (distAhead < safetyDistance) {
                        shouldWait = true;
                    }
                }
            }
        });

        // Implement Intelligent Driver Model (IDM) for speed control
        if (vehicleAhead) {
            const deltaV = vehicle.speed - vehicleAhead.speed;
            const s0 = 2.0; // Minimum safe distance
            const T = 1.5; // Safe time headway
            const a = 1.0; // Maximum acceleration
            const b = 3.0; // Comfortable deceleration

            const s = vehicleAheadDistance * 100; // Convert to meters
            const sStar = s0 + Math.max(0, vehicle.speed * T + (vehicle.speed * deltaV) / (2 * Math.sqrt(a * b)));

            // Calculate desired acceleration
            const acceleration = a * (1 - Math.pow(vehicle.speed / vehicle.desiredSpeed, 4) - Math.pow(sStar / s, 2));

            // Update speed based on acceleration
            vehicle.speed = Math.max(0, vehicle.speed + acceleration * (deltaTime / 1000));
        } else {
            // No vehicle ahead, accelerate towards desired speed
            const acceleration = 0.5; // Comfortable acceleration
            vehicle.speed = Math.min(vehicle.desiredSpeed, vehicle.speed + acceleration * (deltaTime / 1000));
        }

        // Check if car should try to change lanes
        if (vehicle.type === 'car' && vehicle.laneChangeProgress >= 1.0 && vehicle.laneChangeTimer <= 0) {
            // Increase lane change probability when stuck
            let baseChance = blockedAhead ? vehicle.laneChangeFrequency * 1.5 : vehicle.laneChangeFrequency * 0.2;

            // If car is stuck for a while, increasingly encourage lane changes
            if (vehicle.stuckTimer > 0) {
                const stuckBoost = Math.min(vehicle.stuckTimer / 3000, 1) * 0.5;
                baseChance += stuckBoost;
            }

            // Roll for lane change attempt
            if (Math.random() < baseChance) {
                const changed = tryChangeCarLane(vehicle, updatedVehicles, buses, lanes);

                // If car is stuck and couldn't change lanes, try more aggressively
                if (!changed && vehicle.stuckTimer > 2000) {
                    tryEmergencyLaneChange(vehicle, updatedVehicles, buses, lanes);
                }
            }
        }

        // Apply speed factor to update position
        if (!shouldWait) {
            // Convert deltaTime from milliseconds to seconds for proper speed scaling
            const deltaTimeSeconds = deltaTime / 1000;
            vehicle.pathPosition += vehicle.speed * deltaTimeSeconds;
            if (vehicle.pathPosition > 1) {
                vehicle.pathPosition -= 1;
            }
        }

        // Update stuck timer
        if (vehicle.speed < 0.1) {
            vehicle.stuckTimer += deltaTime;
        } else {
            vehicle.stuckTimer = 0;
        }
    });

    // Update vehicle positions based on their path position
    updateVehiclePositions(updatedVehicles, lanes);

    // Adjust cars to stay properly aligned in their lanes
    updatedVehicles.forEach(vehicle => {
        if (vehicle.type === 'car' && vehicle.laneChangeProgress >= 1.0) {
            const lane = lanes[vehicle.lane];
            const lanePosition = getPositionOnPath(lane.points, vehicle.pathPosition).y;

            // Stronger correction at the edges of the screen
            const edgeFactor = (vehicle.pathPosition < 0.05 || vehicle.pathPosition > 0.95) ? 0.5 : 0.2;

            if (Math.abs(vehicle.y - lanePosition) > 2) {
                vehicle.y -= (vehicle.y - lanePosition) * edgeFactor;
            }
        }
    });

    return updatedVehicles;
};

/**
 * Try to change a car's lane if possible with improved decision-making.
 * Returns true if lane change initiated, false otherwise.
 */
/**
 * Try to change a car's lane if possible with improved decision-making.
 * Returns true if lane change initiated, false otherwise.
 */
const tryChangeCarLane = (car, vehicles, buses, lanes) => {
    if (car.laneChangeProgress < 1.0) return false;

    const possibleLanes = [1, 2].filter(laneIndex => laneIndex !== car.lane);

    // Skip lane change attempts if the car just changed lanes recently
    if (car.laneChangeTimer > 0) return false;

    // GLOBAL LANE CHANGE LIMIT: Check how many cars are currently changing lanes
    const currentlyChangingLanes = vehicles.filter(v =>
        v.type === 'car' && v.laneChangeProgress < 1.0
    ).length;

    // Limit the number of simultaneous lane changes to prevent mass lane changes
    const maxSimultaneousChanges = Math.max(1, Math.ceil(vehicles.length * 0.05)); // Max 5% of cars
    if (currentlyChangingLanes >= maxSimultaneousChanges) {
        return false;
    }

    // PROXIMITY CHECK: Check if any other vehicles are currently changing lanes nearby
    const nearbyVehicles = vehicles.filter(v =>
        v !== car &&
        v.type === 'car' &&
        v.laneChangeProgress < 1.0 &&
        Math.abs(v.pathPosition - car.pathPosition) < 0.1
    );

    // If there are vehicles changing lanes nearby, wait
    if (nearbyVehicles.length > 0) {
        car.laneChangeTimer = 500; // Short cooldown before trying again
        return false;
    }

    // Analyze current lane conditions
    const currentLaneTraffic = analyzeTrafficAhead(car, [...vehicles, ...buses], 0.2);

    // Evaluate each possible lane
    let bestLane = car.lane;
    let bestLaneScore = -Infinity;

    // Calculate current lane score as baseline
    const currentLaneScore = calculateLaneScore(
        car,
        currentLaneTraffic.vehicleCount,
        currentLaneTraffic.averageSpeed,
        currentLaneTraffic.nearestVehicleDistance
    );

    // Set the current lane as the initial best
    bestLaneScore = currentLaneScore;

    // Check each possible lane
    for (const targetLane of possibleLanes) {
        // Check if lane change is safe (no immediate collision risk)
        if (!isLaneChangeSafe(car, [...vehicles, ...buses], targetLane)) {
            continue;
        }

        // Check if any vehicles in the target lane are planning to change lanes
        const targetLaneVehicles = vehicles.filter(v =>
            v !== car &&
            v.lane === targetLane &&
            v.type === 'car' &&
            v.laneChangeTimer <= 0 &&
            Math.abs(v.pathPosition - car.pathPosition) < 0.15
        );

        // If there are vehicles in the target lane that might change lanes, be more cautious
        if (targetLaneVehicles.length > 0) {
            const mostLikelyToChange = targetLaneVehicles.reduce((most, v) => {
                const chance = v.laneChangeFrequency * (v.stuckTimer > 0 ? 1.5 : 1);
                return chance > most.chance ? { vehicle: v, chance } : most;
            }, { vehicle: null, chance: 0 });

            if (mostLikelyToChange.chance > 0.3) {
                continue; // Skip this lane if another vehicle is likely to change
            }
        }

        // Analyze traffic in target lane
        const targetLaneTraffic = analyzeTrafficAhead(car, [...vehicles, ...buses], 0.2, targetLane);

        // Calculate score for this lane
        const laneScore = calculateLaneScore(
            car,
            targetLaneTraffic.vehicleCount,
            targetLaneTraffic.averageSpeed,
            targetLaneTraffic.nearestVehicleDistance
        );

        // Higher thresholds to make lane changes less frequent
        const improvementThreshold = car.behaviorType === 'aggressive' ? 0.2 :  // Increased from 0.05
            car.behaviorType === 'neutral' ? 0.5 :      // Increased from 0.2
                1.0;                                     // Increased from 0.4

        if (laneScore > bestLaneScore + improvementThreshold) {
            bestLane = targetLane;
            bestLaneScore = laneScore;
        }
    }

    // If best lane is different from current lane, change to it
    if (bestLane !== car.lane) {
        // Add randomization to prevent synchronized changes
        if (Math.random() < 0.7) { // Only 70% chance to actually make the change
            car.targetLane = bestLane;
            car.laneChangeProgress = 0.99;

            // Longer cooldowns between lane changes
            car.laneChangeTimer = car.laneChangeCooldown * (1 + Math.random() * 0.5);

            return true;
        }
    }

    return false;
};

/**
 * For desperate situations: when a vehicle is stuck for a long time,
 * attempt a riskier lane change with reduced safety thresholds
 */
const tryEmergencyLaneChange = (car, vehicles, buses, lanes) => {
    if (car.laneChangeProgress < 1.0) return false;

    const possibleLanes = [1, 2].filter(laneIndex => laneIndex !== car.lane);
    if (possibleLanes.length === 0) return false;

    // Choose the lane with the most space ahead
    let bestLane = possibleLanes[0];
    let bestSpaceAhead = 0;

    for (const targetLane of possibleLanes) {
        // Check minimum safety (reduced safety threshold for emergency)
        let minSafeDistance = 0.01; // Very reduced safety threshold
        let isSafe = true;

        vehicles.forEach(otherVehicle => {
            if (car !== otherVehicle && otherVehicle.lane === targetLane) {
                let dist = Math.abs(otherVehicle.pathPosition - car.pathPosition);
                if (dist > 0.5) dist = 1 - dist;
                if (dist < minSafeDistance) {
                    isSafe = false;
                }
            }
        });

        if (isSafe) {
            // Find space ahead in this lane
            const targetLaneTraffic = analyzeTrafficAhead(car, [...vehicles, ...buses], 0.3, targetLane);
            const spaceAhead = targetLaneTraffic.nearestVehicleDistance;

            if (spaceAhead > bestSpaceAhead) {
                bestSpaceAhead = spaceAhead;
                bestLane = targetLane;
            }
        }
    }

    // If we found a lane with at least some space, change to it
    if (bestSpaceAhead > 0) {
        car.targetLane = bestLane;
        car.laneChangeProgress = 0.99;

        // Short cooldown for emergency changes
        car.laneChangeTimer = 500 + Math.random() * 300;

        return true;
    }

    return false;
};

/**
 * Calculate a score for a lane based on traffic conditions and driver behavior
 */
const calculateLaneScore = (car, vehicleCount, averageSpeed, nearestDistance) => {
    let score = 0;

    // Base score on nearest vehicle distance
    score += nearestDistance * 5;

    // Lower score for lanes with more vehicles
    score -= vehicleCount * 0.5;

    // Prefer lanes with higher average speeds
    score += averageSpeed * 2;

    // Adjust score based on driver behavior
    if (car.behaviorType === 'aggressive') {
        // Aggressive drivers care more about speed and opportunity
        score += averageSpeed * 2.0;  // Higher weight on speed
        score -= (1 - nearestDistance) * 0.3; // Less penalty for close vehicles
        score -= vehicleCount * 0.3; // Less penalty for traffic
    } else if (car.behaviorType === 'polite') {
        // Polite drivers prefer safety and stability
        score += nearestDistance * 3; // Higher weight on safety distance
        score += averageSpeed * 0.5; // Lower weight on speed
        score -= vehicleCount * 0.7; // Higher penalty for traffic

        // Polite drivers strongly prefer to stay in their lane
        if (car.lane === car.preferredLane) {
            score += 2.0; // Significant bonus for staying in preferred lane
        }
    } else {
        // Neutral drivers have balanced preferences
        score += nearestDistance * 2;
        score += averageSpeed * 1.0;
        score -= vehicleCount * 0.5;

        // Moderate preference for preferred lane
        if (car.lane === car.preferredLane) {
            score += 1.0;
        }
    }

    // If car is stuck, make any lane change more appealing
    if (car.stuckTimer > 0) {
        const stuckFactor = Math.min(car.stuckTimer / 5000, 1);
        score += stuckFactor * 3;
    }

    return score;
};

/**
 * Check if changing to the target lane is safe
 */
const isLaneChangeSafe = (car, vehicles, targetLane) => {
    // Safe by default
    let isSafe = true;

    // Define safety thresholds based on behavior
    const frontSafeDistance = car.behaviorType === 'aggressive' ? 0.02 :
        car.behaviorType === 'neutral' ? 0.03 : 0.05;

    const rearSafeDistance = car.behaviorType === 'aggressive' ? 0.01 :
        car.behaviorType === 'neutral' ? 0.02 : 0.04;

    // Check for vehicles in the target lane
    vehicles.forEach(otherVehicle => {
        if (car !== otherVehicle && otherVehicle.lane === targetLane && otherVehicle.active !== false) {
            let dist = otherVehicle.pathPosition - car.pathPosition;

            // Handle wrapping around the loop
            if (dist > 0.5) dist -= 1;
            if (dist < -0.5) dist += 1;

            // Check if vehicle is ahead or behind
            if (dist > 0 && dist < frontSafeDistance) {
                isSafe = false; // Too close to vehicle ahead
            } else if (dist < 0 && dist > -rearSafeDistance) {
                // Vehicle behind
                // If it's very close and faster than us, not safe
                if (otherVehicle.speed > car.speed * 1.2) {
                    isSafe = false;
                }
            }
        }
    });

    return isSafe;
};

/**
 * Analyze traffic ahead of the car in a specified lane
 */
const analyzeTrafficAhead = (car, vehicles, lookAheadDistance, specificLane = null) => {
    const laneToCheck = specificLane !== null ? specificLane : car.lane;
    let vehiclesAhead = [];
    let nearestVehicleDistance = lookAheadDistance;

    // Find all vehicles ahead in the specified lane
    vehicles.forEach(otherVehicle => {
        if (car !== otherVehicle && otherVehicle.lane === laneToCheck && otherVehicle.active !== false) {
            let distAhead = otherVehicle.pathPosition - car.pathPosition;

            // Handle wrapping around the loop
            if (distAhead < 0) distAhead += 1;

            // Only consider vehicles within lookAheadDistance
            if (distAhead > 0 && distAhead < lookAheadDistance) {
                vehiclesAhead.push({
                    vehicle: otherVehicle,
                    distance: distAhead,
                    speed: otherVehicle.speed
                });

                // Track nearest vehicle
                if (distAhead < nearestVehicleDistance) {
                    nearestVehicleDistance = distAhead;
                }
            }
        }
    });

    // Calculate average speed of traffic ahead
    let averageSpeed = 0;
    if (vehiclesAhead.length > 0) {
        const totalSpeed = vehiclesAhead.reduce((sum, data) => sum + data.speed, 0);
        averageSpeed = totalSpeed / vehiclesAhead.length;
    } else {
        // If no vehicles ahead, use maximum possible speed
        averageSpeed = car.speed * 1.5;
    }

    return {
        vehicleCount: vehiclesAhead.length,
        averageSpeed: averageSpeed,
        nearestVehicleDistance: nearestVehicleDistance,
        vehicles: vehiclesAhead
    };
};