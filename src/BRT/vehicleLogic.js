import {
    CAR_COLORS,
    CAR_LENGTH_METERS,
    CAR_WIDTH_METERS,
    BUS_LENGTH_METERS,
    BUS_WIDTH_METERS,
    VEHICLE_VISIBILITY_FACTOR
} from './constants';

// Define behavior types for cars
const BEHAVIOR_TYPES = {
    POLITE: 'polite',      // Rarely changes lanes, very cautious
    NEUTRAL: 'neutral',    // Changes lanes when necessary
    AGGRESSIVE: 'aggressive' // Frequently changes lanes when possible
};

/* ------------------------------ CAR SPAWNING ------------------------------ */

/**
 * Creates a new car object using the same settings as before.
 * New cars are spawned at the left side of the road (pathPosition = 0).
 */
export const createCar = (settings, lanes, scaleFactor) => {
    // Cars choose randomly between lane 1 and 2.
    const laneIndex = 1 + Math.floor(Math.random() * 2);

    // Convert speed to match simulation timing
    // Real time: 3.12 minutes (187 seconds) for 2.6km at 50 km/h
    // Simulation time: 30 seconds for 2.6km
    // Speed factor = 187/30 = 6.23
    const baseSpeed = (1 / 30) * 6.23; // One full loop takes 30 seconds in simulation time

    // More realistic speed variations
    const speedVariation = Math.random() * 0.3 + 0.85; // 85-115% of base speed
    const speed = baseSpeed * speedVariation;

    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

    // Adjust behavior type probabilities for more realistic distribution
    const behaviorTypes = [BEHAVIOR_TYPES.POLITE, BEHAVIOR_TYPES.NEUTRAL, BEHAVIOR_TYPES.AGGRESSIVE];
    const behaviorProbabilities = [0.3, 0.5, 0.2]; // 30% polite, 50% neutral, 20% aggressive
    const random = Math.random();
    let behaviorType;

    if (random < behaviorProbabilities[0]) {
        behaviorType = behaviorTypes[0]; // Polite
    } else if (random < behaviorProbabilities[0] + behaviorProbabilities[1]) {
        behaviorType = behaviorTypes[1]; // Neutral
    } else {
        behaviorType = behaviorTypes[2]; // Aggressive
    }

    let laneChangeFrequency, safeDistance, speedAdjustment, laneChangeCooldown;
    switch (behaviorType) {
        case BEHAVIOR_TYPES.POLITE:
            laneChangeFrequency = 0.05;  // Very low chance to change lanes
            safeDistance = 0.1;         // Larger safety distance
            speedAdjustment = 0.85;     // Slightly slower speed
            laneChangeCooldown = 6000;  // Longer cooldown between lane changes
            break;
        case BEHAVIOR_TYPES.NEUTRAL:
            laneChangeFrequency = 0.3;   // Moderate chance to change lanes
            safeDistance = 0.06;         // Moderate safety distance
            speedAdjustment = 0.95;      // Slightly slower speed
            laneChangeCooldown = 4000;   // Moderate cooldown
            break;
        case BEHAVIOR_TYPES.AGGRESSIVE:
            laneChangeFrequency = 0.6;   // High chance to change lanes
            safeDistance = 0.04;         // Smaller safety distance
            speedAdjustment = 1.1;       // Slightly faster speed
            laneChangeCooldown = 3000;   // Short cooldown
            break;
        default:
            laneChangeFrequency = 0.3;
            safeDistance = 0.06;
            speedAdjustment = 0.95;
            laneChangeCooldown = 4000;
    }

    return {
        type: 'car',
        pathPosition: 0,
        lane: laneIndex,
        direction: 'right',
        speed: speed * speedAdjustment,
        color,
        width: CAR_LENGTH_METERS * scaleFactor * VEHICLE_VISIBILITY_FACTOR,
        height: CAR_WIDTH_METERS * scaleFactor * VEHICLE_VISIBILITY_FACTOR,
        waiting: false,
        stoppedAtBusStop: false,
        x: 0,
        y: 0,
        initialPositioning: true,
        behaviorType: behaviorType,
        laneChangeFrequency: laneChangeFrequency,
        safeDistance: safeDistance,
        laneChangeTimer: 0,
        preferredLane: laneIndex,
        targetLane: laneIndex,
        laneChangeProgress: 1.0,
        laneChangeDuration: behaviorType === BEHAVIOR_TYPES.AGGRESSIVE ? 1500 :
            behaviorType === BEHAVIOR_TYPES.NEUTRAL ? 2500 : 3500,
        laneChangeCooldown: laneChangeCooldown,
        lastLaneChangeTime: 0,
        passengers: 3,
        throughput: 0,
        stuckTimer: 0,
        lastSpeed: speed * speedAdjustment,
        acceleration: 0,
        desiredSpeed: speed * speedAdjustment
    };
};

/* ------------------------------ BUS SCHEDULING ------------------------------ */

/**
 * Initialize bus vehicles with proper properties and schedule them.
 * At simulation start, only one bus is active (pathPosition = 0).
 * Subsequent buses are created off-screen and activated on schedule.
 */
export const initializeBuses = (settings, lanes, scaleFactor) => {
    const buses = [];
    // Set bus frequency to match 3-minute intervals in real time
    // 3 minutes real time = 10 seconds simulation time
    const busScheduleInterval = 10000; // 10 seconds between buses

    // Create the first bus and activate it immediately
    buses.push(createBus(0, 0, settings, scaleFactor, true));

    // Create remaining buses as inactive and schedule their activation
    for (let i = 1; i < settings.busCount; i++) {
        buses.push(createBus(i, -0.1, settings, scaleFactor, false));
        setTimeout(() => {
            if (buses[i]) {
                buses[i].active = true;
                buses[i].pathPosition = 0;
            }
        }, i * busScheduleInterval);
    }

    return buses;
};

/**
 * Create a single bus with appropriate properties.
 * @param {Number} index - Bus index.
 * @param {Number} pathPosition - Initial path position.
 * @param {Object} settings - Simulation settings.
 * @param {Number} scaleFactor - Scale factor for dimensions.
 * @param {Boolean} active - Whether this bus is active immediately.
 */
const createBus = (index, pathPosition, settings, scaleFactor, active = true) => {
    const laneIndex = 0; // Buses use lane 0

    // Calculate bus speed for 2.6km in 3 minutes (adjusted for simulation time)
    // Real speed: 2.6km/3min = 14.44 m/s
    // Simulation runs 18x faster (3min = 10s), so adjust speed accordingly
    const baseSpeed = 14.44 * (10 / 180); // Convert to simulation speed
    const speed = baseSpeed * scaleFactor; // Adjust for canvas scale

    return {
        type: 'bus',
        pathPosition: pathPosition,
        lane: laneIndex,
        direction: 'right',
        speed,
        color: '#219ebc',
        width: BUS_LENGTH_METERS * scaleFactor * VEHICLE_VISIBILITY_FACTOR,
        height: BUS_WIDTH_METERS * scaleFactor * VEHICLE_VISIBILITY_FACTOR,
        waiting: false,
        stoppedAtBusStop: -1,
        stopTime: 0,
        x: 0,
        y: 0,
        initialPositioning: true,
        active: active,
        passengers: Math.floor(Math.random() * 21) + 70, // Random passengers between 70-90
        capacity: 90,
        lastVisitedStop: -1,
        justLeftStop: false,
        busId: index + 1,
        throughput: 0 // Track passengers moved from A to B
    };
};

/* ------------------------------ UTILITY FUNCTIONS ------------------------------ */

/**
 * Ease in-out cubic easing function.
 */
const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Update positions of vehicles (both cars and buses) based on their pathPosition.
 */
export const updateVehiclePositions = (vehicleList, lanes) => {
    vehicleList.forEach(vehicle => {
        if (vehicle.type === 'car' && vehicle.laneChangeProgress < 1.0) {
            const fromLane = lanes[vehicle.lane];
            const toLane = lanes[vehicle.targetLane];
            const fromPos = getPositionOnPath(fromLane.points, vehicle.pathPosition);
            const toPos = getPositionOnPath(toLane.points, vehicle.pathPosition);
            const t = 1 - vehicle.laneChangeProgress;
            const easedT = easeInOutCubic(t);

            vehicle.x = fromPos.x + (toPos.x - fromPos.x) * easedT;
            const directY = fromPos.y + (toPos.y - fromPos.y) * easedT;
            const arcHeight = Math.abs(toPos.y - fromPos.y) * 0.2;
            const arcEffect = Math.sin(easedT * Math.PI) * arcHeight;
            vehicle.y = directY + arcEffect;

            const fromDir = getDirectionOnPath(fromLane.points, vehicle.pathPosition);
            const toDir = getDirectionOnPath(toLane.points, vehicle.pathPosition);
            const fromAngle = Math.atan2(fromDir.y, fromDir.x);
            const toAngle = Math.atan2(toDir.y, toDir.x);
            let angleDiff = toAngle - fromAngle;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            vehicle.angle = fromAngle + angleDiff * easedT;
        } else {
            const lane = lanes[vehicle.lane];
            const position = getPositionOnPath(lane.points, vehicle.pathPosition);
            const direction = getDirectionOnPath(lane.points, vehicle.pathPosition);
            vehicle.x = position.x;
            vehicle.y = position.y;
            if (vehicle.initialPositioning) {
                vehicle.y = position.y;
                vehicle.initialPositioning = false;
            }
            vehicle.angle = Math.atan2(direction.y, direction.x);
        }
    });
};

/**
 * Get position on a path using Catmull-Rom spline interpolation.
 */
export const getPositionOnPath = (points, t) => {
    t = Math.max(0, Math.min(1, t));
    const numSegments = points.length - 1;
    const segmentT = t * numSegments;
    const segmentIndex = Math.floor(segmentT);
    const segmentFraction = segmentT - segmentIndex;
    const p0 = points[Math.max(0, segmentIndex - 1)];
    const p1 = points[Math.min(segmentIndex, points.length - 1)];
    const p2 = points[Math.min(segmentIndex + 1, points.length - 1)];
    const p3 = points[Math.min(segmentIndex + 2, points.length - 1)];
    return catmullRomInterpolation(p0, p1, p2, p3, segmentFraction);
};

const catmullRomInterpolation = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    const t3 = t2 * t;
    const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    return { x, y };
};

/**
 * Get a direction vector from a set of path points.
 */
export const getDirectionOnPath = (points, t) => {
    const epsilon = 0.001;
    const posAhead = getPositionOnPath(points, t + epsilon);
    const posBehind = getPositionOnPath(points, t - epsilon);
    return {
        x: posAhead.x - posBehind.x,
        y: posAhead.y - posBehind.y
    };
};

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

/* ------------------------------ BUS UPDATE ------------------------------ */

/**
 * Update buses for each animation frame.
 */
export const updateBuses = (prevBuses, vehicles, busStops, canvasWidth, deltaTime, lanes) => {
    const updatedBuses = [...prevBuses];

    // Initialize bus stops if needed
    busStops.forEach(stop => {
        if (!stop.lastUpdateTime) {
            stop.lastUpdateTime = Date.now();
            stop.waitingPassengers = 0;
        }
    });

    // Update passenger waiting at stations
    const currentTime = Date.now();
    busStops.forEach(stop => {
        const timeDiff = (currentTime - stop.lastUpdateTime) / 1000; // Convert to seconds

        if (timeDiff >= 1) {
            // Add 0-5 passengers per second, but don't exceed 20
            const newPassengers = Math.floor(Math.random() * 6);
            stop.waitingPassengers = Math.min(stop.waitingPassengers + newPassengers, 20);
            stop.lastUpdateTime = currentTime;
        }
    });

    updatedBuses.forEach(bus => {
        if (!bus.active) return;

        if (bus.stoppedAtBusStop >= 0) {
            bus.stopTime += deltaTime;
            const currentStop = busStops[bus.stoppedAtBusStop];

            // Calculate base stop time based on passenger operations
            const passengersToDrop = Math.min(bus.passengers, Math.floor(Math.random() * 10) + 5);
            const waitingPassengers = currentStop.waitingPassengers || 0;
            const availableSpace = bus.capacity - bus.passengers;
            const passengersToPickUp = Math.min(waitingPassengers, availableSpace);

            // Very fast stop time calculation (0.1 seconds per passenger)
            const baseStopTime = 200 + (passengersToDrop + passengersToPickUp) * 100;

            // If we've been stopped long enough
            if (bus.stopTime >= baseStopTime) {
                // Drop off passengers
                bus.passengers -= passengersToDrop;
                bus.passengersDroppedOff = (bus.passengersDroppedOff || 0) + passengersToDrop;

                // Pick up waiting passengers
                bus.passengers += passengersToPickUp;
                currentStop.waitingPassengers = Math.max(0, waitingPassengers - passengersToPickUp);

                bus.stoppedAtBusStop = -1;
                bus.stopTime = 0;
                bus.justLeftStop = true;
            }
        } else {
            busStops.forEach((stop, stopIndex) => {
                if (stopIndex === bus.lastVisitedStop || bus.justLeftStop) return;

                const busPos = bus.x;
                const stopPos = stop.x;
                const stoppingDistance = bus.width * 0.15;
                const isApproachingFromLeft = busPos < stopPos && (stopPos - busPos) < stoppingDistance;

                if (isApproachingFromLeft) {
                    const busLane = lanes[bus.lane];
                    const laneY = getPositionOnPath(busLane.points, bus.pathPosition).y;

                    if (Math.abs(laneY - stop.y) < bus.height) {
                        // Only stop if bus is not full or there are passengers waiting
                        if (bus.passengers < bus.capacity || stop.waitingPassengers > 0) {
                            bus.stoppedAtBusStop = stopIndex;
                            // Initial stop time will be updated based on passenger count
                            bus.stopTime = 0;
                            bus.waiting = true;
                        }
                    }
                }
            });

            if (bus.pathPosition < 0.05 && bus.lastVisitedStop !== -1) {
                bus.lastVisitedStop = -1;
            }

            let shouldWait = false;
            let vehicleAheadDistance = 1.0;
            let obstacleDetected = false;
            [...updatedBuses, ...vehicles].forEach(otherVehicle => {
                if (!otherVehicle.active && otherVehicle.type === 'bus') return;
                if (bus !== otherVehicle && bus.lane === otherVehicle.lane) {
                    let distAhead = otherVehicle.pathPosition - bus.pathPosition;
                    if (distAhead < 0) distAhead += 1;
                    if (distAhead > 0 && distAhead < vehicleAheadDistance) {
                        vehicleAheadDistance = distAhead;
                    }
                    if (distAhead > 0 && distAhead < 0.08) {
                        obstacleDetected = true;
                        if (distAhead < 0.03) {
                            shouldWait = true;
                        }
                    }
                }
            });
            if (bus.stoppedAtBusStop === -1) {
                bus.waiting = shouldWait;
            }
            if (!bus.waiting) {
                let speedFactor = 0.00005 * (5000 / 2600);
                if (vehicleAheadDistance < 0.15) {
                    speedFactor *= Math.min(vehicleAheadDistance * 10, 0.8);
                }
                bus.pathPosition += bus.speed * speedFactor * deltaTime;
                if (bus.pathPosition > 1) {
                    bus.pathPosition = 0;
                    bus.lastVisitedStop = -1;
                }
            }
        }
    });

    updateVehiclePositions(updatedBuses.filter(bus => bus.active), lanes);

    updatedBuses.forEach(bus => {
        if (!bus.active) return;
        if (bus.stoppedAtBusStop < 0) {
            const lane = lanes[bus.lane];
            const lanePosition = getPositionOnPath(lane.points, bus.pathPosition);
            const offsetY = bus.y - lanePosition.y;
            const edgeFactor = (bus.pathPosition < 0.05 || bus.pathPosition > 0.95) ? 0.5 : 0.2;
            if (Math.abs(offsetY) > 2) {
                bus.y -= offsetY * edgeFactor;
            }
        }
    });

    return updatedBuses;
};

/* ------------------------------ EXPORTS ------------------------------ */

// Add throughput tracking function
export const updateThroughput = (vehicles, buses) => {
    let carThroughput = 0;
    let busThroughput = 0;

    // Count car throughput (3 passengers per car that completes a full loop)
    vehicles.forEach(vehicle => {
        if (vehicle.type === 'car' && vehicle.pathPosition > 0.95) {
            carThroughput += 3; // Each car has exactly 3 passengers
            vehicle.pathPosition = 0; // Reset position to start
        }
    });

    // Count bus throughput (passengers dropped off + passengers on bus when it exits)
    buses.forEach(bus => {
        if (bus.active) {
            // Count passengers dropped off at stations
            if (bus.justLeftStop) {
                const passengersDroppedOff = bus.passengersDroppedOff || 0;
                busThroughput += passengersDroppedOff;
                bus.passengersDroppedOff = 0; // Reset after counting
                bus.justLeftStop = false;
            }

            // Count passengers on bus when it exits the simulation (point A to B)
            if (bus.pathPosition > 0.95 && !bus.throughputCounted) {
                busThroughput += bus.passengers || 0;
                bus.throughputCounted = true;
            }
        }
    });

    const totalPassengers = carThroughput + busThroughput;

    // Always return an object with all required properties
    return {
        cars: carThroughput,
        buses: busThroughput,
        totalPassengers: totalPassengers,
        timestamp: Date.now()
    };
};
