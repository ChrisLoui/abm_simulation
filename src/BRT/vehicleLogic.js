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
    const speed = Math.random() * (settings.maxSpeed - settings.minSpeed) + settings.minSpeed;
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const behaviorTypes = [BEHAVIOR_TYPES.POLITE, BEHAVIOR_TYPES.NEUTRAL, BEHAVIOR_TYPES.AGGRESSIVE];
    const behaviorType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];

    let laneChangeFrequency, safeDistance, speedAdjustment;
    switch (behaviorType) {
      case BEHAVIOR_TYPES.POLITE:
        laneChangeFrequency = 0.3;
        safeDistance = 0.07;
        speedAdjustment = 0.9;
        break;
      case BEHAVIOR_TYPES.NEUTRAL:
        laneChangeFrequency = 0.6;
        safeDistance = 0.05;
        speedAdjustment = 1.0;
        break;
      case BEHAVIOR_TYPES.AGGRESSIVE:
        laneChangeFrequency = 0.9;
        safeDistance = 0.03;
        speedAdjustment = 1.1;
        break;
      default:
        laneChangeFrequency = 0.5;
        safeDistance = 0.07;
        speedAdjustment = 1.0;
    }

    return {
      type: 'car',
      pathPosition: 0,  // Spawn at the left side of the road.
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
      laneChangeProgress: 1.0,  // 1.0 means no active lane change.
      laneChangeDuration: behaviorType === BEHAVIOR_TYPES.AGGRESSIVE ? 1200 :
                          behaviorType === BEHAVIOR_TYPES.NEUTRAL ? 1500 : 1800
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
    // This interval (in ms) represents the delay between bus activations.
    const busScheduleInterval = 3000; // e.g., 3000ms equals 30 simulation minutes (adjust as needed).

    // Create the first bus and activate it immediately.
    buses.push(createBus(0, 0, settings, scaleFactor, true));

    // Create remaining buses as inactive (off-screen) and schedule their activation.
    for (let i = 1; i < settings.busCount; i++) {
      buses.push(createBus(i, -0.1, settings, scaleFactor, false));
      setTimeout(() => {
        if (buses[i]) {
          buses[i].active = true;
          // Reset starting position so that they appear from the left.
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
    const laneIndex = 0; // Buses use lane 0.
    const speed = (settings.minSpeed + settings.maxSpeed) / 2 * 0.8; // Buses move slower.
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
      active: active
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

    updatedVehicles.forEach(vehicle => {
      let shouldWait = false;
      let blockedAhead = false;
      let vehicleAheadDistance = 1.0;

      if (vehicle.laneChangeTimer > 0) {
        vehicle.laneChangeTimer -= deltaTime;
      }

      if (vehicle.type === 'car' && vehicle.laneChangeProgress < 1.0) {
        const baseDuration = vehicle.laneChangeDuration;
        const progressChangePerMs = 1 / baseDuration;
        vehicle.laneChangeProgress -= progressChangePerMs * deltaTime;
        if (vehicle.laneChangeProgress <= 0) {
          vehicle.lane = vehicle.targetLane;
          vehicle.laneChangeProgress = 1.0;
        }
      } else {
        // Check vehicles ahead in the same lane (from both cars and buses).
        [...updatedVehicles, ...buses].forEach(otherVehicle => {
          if (vehicle !== otherVehicle && vehicle.lane === otherVehicle.lane && otherVehicle.active !== false) {
            let distAhead = otherVehicle.pathPosition - vehicle.pathPosition;
            if (distAhead < 0) distAhead += 1;
            if (distAhead > 0 && distAhead < vehicleAheadDistance) {
              vehicleAheadDistance = distAhead;
            }

            // Adjust detection distance based on behavior and speed
            const speedFactor = vehicle.speed / 3.0; // Normalize to typical max speed
            const baseDetectionDistance = vehicle.behaviorType === 'aggressive' ? 0.05 :
                                         vehicle.behaviorType === 'neutral' ? 0.04 : 0.03;
            const detectionDistance = baseDetectionDistance * (1 + speedFactor * 0.5);

            if (distAhead > 0 && distAhead < detectionDistance) {
              blockedAhead = true;
              const safetyDistance = vehicle.behaviorType === 'aggressive' ? 0.015 :
                                    vehicle.behaviorType === 'neutral' ? 0.02 : 0.025;
              if (distAhead < safetyDistance) {
                shouldWait = true;
              }
            }
          }
        });

        // Check if car should try to change lanes
        if (vehicle.type === 'car' && vehicle.laneChangeTimer <= 0) {
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
              // For very stuck vehicles, try a more desperate lane change
              tryEmergencyLaneChange(vehicle, updatedVehicles, buses, lanes);
            }
          }
        }
      }

      vehicle.waiting = shouldWait;

      if (!vehicle.waiting) {
        // Compute a base speed factor.
        const baseSpeedFactor = 0.00005 * (5000 / 2600);
        let speedFactor = baseSpeedFactor;

        // If blocked, adjust slowdown based on distance and behavior
        if (blockedAhead) {
          const baseSlowDownFactor = vehicle.behaviorType === 'aggressive' ? 14 :
                                    vehicle.behaviorType === 'neutral' ? 12 : 10;

          // Apply more gradual slowdown based on distance ahead
          speedFactor *= Math.max(0.3, Math.min(vehicleAheadDistance * baseSlowDownFactor, 0.8));

          // Aggressive drivers maintain higher speeds in traffic
          if (vehicle.behaviorType === 'aggressive' && vehicleAheadDistance > 0.03) {
            speedFactor *= 1.2;
          }
        }

        // During lane change, apply speed adjustments
        if (vehicle.type === 'car' && vehicle.laneChangeProgress < 1.0) {
          const laneChangePhase = Math.abs(vehicle.laneChangeProgress - 0.5) * 2;

          // Different behavior types have different lane change speed patterns
          if (vehicle.behaviorType === 'aggressive') {
            // Aggressive drivers maintain higher speeds during lane changes
            const speedReduction = 0.9 + laneChangePhase * 0.1;
            speedFactor *= speedReduction;
          } else if (vehicle.behaviorType === 'neutral') {
            // Neutral drivers have moderate slowdown
            const speedReduction = 0.85 + laneChangePhase * 0.15;
            speedFactor *= speedReduction;
          } else {
            // Polite drivers slow down more during lane changes
            const speedReduction = 0.8 + laneChangePhase * 0.2;
            speedFactor *= speedReduction;
          }
        }

        // Apply speed factor to update position
        vehicle.pathPosition += vehicle.speed * speedFactor * deltaTime;
        if (vehicle.pathPosition > 1) {
          vehicle.pathPosition -= 1;
        }
      }
    });

    // Update vehicle positions based on their path position
    updateVehiclePositions(updatedVehicles, lanes);

    // Adjust cars to stay properly aligned in their lanes
    updatedVehicles.forEach(vehicle => {
      if (vehicle.type === 'car' && vehicle.laneChangeProgress >= 1.0) {
        const lane = lanes[vehicle.lane];
        const lanePosition = getPositionOnPath(lane.points, vehicle.pathPosition);
        const offsetY = vehicle.y - lanePosition.y;

        // Stronger correction at the edges of the screen
        const edgeFactor = (vehicle.pathPosition < 0.05 || vehicle.pathPosition > 0.95) ? 0.5 : 0.2;

        if (Math.abs(offsetY) > 2) {
          vehicle.y -= offsetY * edgeFactor;
        }
      }
    });

    return updatedVehicles;
  };

  /**
   * Try to change a car's lane if possible with improved decision-making.
   * Returns true if lane change initiated, false otherwise.
   */
  const tryChangeCarLane = (car, vehicles, buses, lanes) => {
    if (car.laneChangeProgress < 1.0) return false;

    const possibleLanes = [1, 2].filter(laneIndex => laneIndex !== car.lane);

    // Skip lane change attempts if the car just changed lanes recently
    if (car.laneChangeTimer > 0) return false;

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

      // Analyze traffic in target lane
      const targetLaneTraffic = analyzeTrafficAhead(car, [...vehicles, ...buses], 0.2, targetLane);

      // Calculate score for this lane
      const laneScore = calculateLaneScore(
        car,
        targetLaneTraffic.vehicleCount,
        targetLaneTraffic.averageSpeed,
        targetLaneTraffic.nearestVehicleDistance
      );

      // If this lane is significantly better, choose it
      // Make the improvement threshold dependent on driver type
      const improvementThreshold = car.behaviorType === 'aggressive' ? 0.1 :
                                  car.behaviorType === 'neutral' ? 0.3 : 0.5;

      if (laneScore > bestLaneScore + improvementThreshold) {
        bestLane = targetLane;
        bestLaneScore = laneScore;
      }
    }

    // If best lane is different from current lane, change to it
    if (bestLane !== car.lane) {
      car.targetLane = bestLane;
      // Begin the lane-change transition
      car.laneChangeProgress = 0.99;

      // Set cooldown based on behavior type
      const baseCooldown = car.behaviorType === 'aggressive' ? 800 :
                           car.behaviorType === 'neutral' ? 1200 : 1800;
      car.laneChangeTimer = baseCooldown + Math.random() * 500;

      // If car is completely stuck, reduce cooldown to allow more frequent changes
      if (car.stuckTimer > 2000) {
        car.laneChangeTimer *= 0.5;
      }

      return true;
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
      // Aggressive drivers care more about speed, less about safety
      score += averageSpeed * 1.5;
      score -= (1 - nearestDistance) * 0.5; // Less penalty for close vehicles
    } else if (car.behaviorType === 'polite') {
      // Polite drivers prefer safety, care less about speed
      score += nearestDistance * 2;
      score += averageSpeed * 0.5;

      // Polite drivers prefer to stay in their lane
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

    updatedBuses.forEach(bus => {
      if (!bus.active) return;
      if (bus.stuckTimer === undefined) {
        bus.stuckTimer = 0;
        bus.lastPosition = bus.pathPosition;
        bus.consecutiveStuckFrames = 0;
        bus.previousX = bus.x;
      }
      const positionChange = Math.abs(bus.pathPosition - bus.lastPosition);
      const actualMovement = Math.abs(bus.x - bus.previousX);
      const isStuck = (positionChange < 0.0001 || actualMovement < 0.1);
      if (isStuck && bus.stoppedAtBusStop === -1 && !bus.justLeftStop) {
        bus.stuckTimer += deltaTime;
        bus.consecutiveStuckFrames++;
      } else {
        if (actualMovement > 0.5) {
          bus.stuckTimer = 0;
          bus.consecutiveStuckFrames = 0;
        }
      }
      if (bus.stoppedAtBusStop >= 0) {
        bus.stopTime -= deltaTime;
        if (bus.stopTime <= 0) {
          bus.lastVisitedStop = bus.stoppedAtBusStop;
          bus.stoppedAtBusStop = -1;
          bus.waiting = false;
          bus.justLeftStop = true;
          bus.stuckTimer = 0;
          bus.consecutiveStuckFrames = 0;
          setTimeout(() => {
            if (bus) bus.justLeftStop = false;
          }, 1000);
        } else {
          bus.waiting = true;
          bus.stuckTimer = 0;
          bus.consecutiveStuckFrames = 0;
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
              bus.stoppedAtBusStop = stopIndex;
              bus.stopTime = Math.random() * 300;
              bus.waiting = true;
              bus.stuckTimer = 0;
              bus.consecutiveStuckFrames = 0;
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
        bus.lastPosition = bus.pathPosition;
        bus.previousX = bus.x;
        if (!bus.waiting) {
          let speedFactor = 0.00005 * (5000 / 2600);
          if (vehicleAheadDistance < 0.15) {
            speedFactor *= Math.min(vehicleAheadDistance * 10, 0.8);
          }
          bus.pathPosition += bus.speed * speedFactor * deltaTime;
          if (bus.pathPosition > 1) {
            bus.pathPosition = 0;
            bus.lastVisitedStop = -1;
            bus.stuckTimer = 0;
            bus.consecutiveStuckFrames = 0;
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
