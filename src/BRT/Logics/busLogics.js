import {
    BUS_WIDTH_METERS,
    BUS_LENGTH_METERS,
    VEHICLE_VISIBILITY_FACTOR,
} from '../constants';

import {
    getPositionOnPath,
    updateVehiclePositions
} from './utilitiFuntions';

// Import lane changing functions from updateFunctions
import {
    analyzeTrafficAhead,
    calculateLaneScore,
    isLaneChangeSafe
} from './updateFunctions';

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
    // If there's no bus lane, randomly assign a lane (0, 1, or 2)
    // If there is a bus lane, always use lane 0
    const laneIndex = settings.hasBusLane ? 0 : Math.floor(Math.random() * 3);

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
        passengers: Math.floor(Math.random() * 30) + 20,
        capacity: 49,
        lastVisitedStop: -1,
        justLeftStop: false,
        busId: index + 1,
        throughput: 0, // Track passengers moved from A to B
        shouldStopAtStations: settings.hasBusLane,
        // Add lane changing properties
        laneChangeProgress: 1.0,
        laneChangeTimer: 0,
        targetLane: laneIndex,
        laneChangeDuration: 1000,
        laneChangeCooldown: 3000,
        stuckTimer: 0,
        behaviorType: 'neutral', // Buses are always neutral in behavior
        desiredSpeed: speed,
        preferredLane: laneIndex
    };
};

/**
 * Try to change a bus's lane if possible.
 * Returns true if lane change initiated, false otherwise.
 */
const tryChangeBusLane = (bus, vehicles, buses, lanes) => {
    if (bus.laneChangeProgress < 1.0) return false;

    const possibleLanes = [1, 2].filter(laneIndex => laneIndex !== bus.lane);

    // Skip lane change attempts if the bus just changed lanes recently
    if (bus.laneChangeTimer > 0) return false;

    // Check how many vehicles are currently changing lanes
    const currentlyChangingLanes = [...vehicles, ...buses].filter(v =>
        v.laneChangeProgress < 1.0
    ).length;

    // Limit simultaneous lane changes
    const maxSimultaneousChanges = Math.max(1, Math.ceil((vehicles.length + buses.length) * 0.05));
    if (currentlyChangingLanes >= maxSimultaneousChanges) {
        return false;
    }

    // Check for nearby vehicles changing lanes
    const nearbyVehicles = [...vehicles, ...buses].filter(v =>
        v !== bus &&
        v.laneChangeProgress < 1.0 &&
        Math.abs(v.pathPosition - bus.pathPosition) < 0.1
    );

    if (nearbyVehicles.length > 0) {
        bus.laneChangeTimer = 500;
        return false;
    }

    // Analyze current lane conditions
    const currentLaneTraffic = analyzeTrafficAhead(bus, [...vehicles, ...buses], 0.2);
    let bestLane = bus.lane;
    let bestLaneScore = calculateLaneScore(bus, currentLaneTraffic.vehicleCount, currentLaneTraffic.averageSpeed, currentLaneTraffic.nearestVehicleDistance);

    // Check each possible lane
    for (const targetLane of possibleLanes) {
        if (!isLaneChangeSafe(bus, [...vehicles, ...buses], targetLane)) {
            continue;
        }

        const targetLaneTraffic = analyzeTrafficAhead(bus, [...vehicles, ...buses], 0.2, targetLane);
        const laneScore = calculateLaneScore(bus, targetLaneTraffic.vehicleCount, targetLaneTraffic.averageSpeed, targetLaneTraffic.nearestVehicleDistance);

        // Higher threshold for buses to change lanes
        if (laneScore > bestLaneScore + 0.5) {
            bestLane = targetLane;
            bestLaneScore = laneScore;
        }
    }

    if (bestLane !== bus.lane) {
        if (Math.random() < 0.7) {
            bus.targetLane = bestLane;
            bus.laneChangeProgress = 0.99;
            bus.laneChangeTimer = bus.laneChangeCooldown * (1 + Math.random() * 0.5);
            return true;
        }
    }

    return false;
};

/* ------------------------------ BUS UPDATE ------------------------------ */

/**
 * Update buses for each animation frame.
 */
export const updateBuses = (
    prevBuses,
    vehicles,
    busStops,
    canvasWidth,
    deltaTime,
    lanes,
    onPassengersAlighted
) => {
    const updatedBuses = [...prevBuses];

    // Initialize bus stops if needed
    busStops.forEach(stop => {
        if (!stop.lastUpdateTime) {
            stop.lastUpdateTime = Date.now();
            stop.waitingPassengers = 0;
        }
    });

    // Only update passenger waiting at stations if buses can stop at them
    const currentTime = Date.now();
    if (updatedBuses.length > 0 && updatedBuses[0].shouldStopAtStations) {
        busStops.forEach(stop => {
            const timeDiff = (currentTime - stop.lastUpdateTime) / 1000; // Convert to seconds

            if (timeDiff >= 1) {
                // Add 0-5 passengers per second, but don't exceed 20
                const newPassengers = Math.floor(Math.random() * 6);
                stop.waitingPassengers = Math.min(stop.waitingPassengers + newPassengers, 20);
                stop.lastUpdateTime = currentTime;
            }
        });
    }

    updatedBuses.forEach(bus => {
        if (!bus.active) return;

        // Reset justLeftStop once bus has moved a bit from last stop (example: pathPosition > 0.1)
        if (bus.justLeftStop && bus.pathPosition > 0.1) {
            bus.justLeftStop = false;
        }

        // Only process bus stops if we should stop at stations
        if (bus.shouldStopAtStations && bus.stoppedAtBusStop >= 0) {
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

                // Notify React component of alighted passengers
                if (onPassengersAlighted) {
                    onPassengersAlighted(passengersToDrop);
                }

                // Pick up waiting passengers
                bus.passengers += passengersToPickUp;
                currentStop.waitingPassengers = Math.max(0, waitingPassengers - passengersToPickUp);

                // Mark bus as having left this stop
                bus.lastVisitedStop = bus.stoppedAtBusStop;
                bus.stoppedAtBusStop = -1;
                bus.stopTime = 0;
                bus.justLeftStop = true;
            }
        } else {
            // Only check for stops if we should stop at stations
            if (bus.shouldStopAtStations) {
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
                                bus.stopTime = 0;
                                bus.waiting = true;
                            }
                        }
                    }
                });
            }

            // If not in a bus lane, try to change lanes like cars
            if (!bus.shouldStopAtStations) {
                tryChangeBusLane(bus, vehicles, updatedBuses, lanes);
            }

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