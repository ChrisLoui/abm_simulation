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
    isLaneChangeSafe,
    calculateLaneChangeRotation,
} from './updateFunctions';

// Create invisible stop points for random bus stops
const createInvisibleStopPoints = () => {
    const stopPoints = [];
    for (let i = 0.08; i <= 0.92; i += 0.10) {
        stopPoints.push({
            pathPosition: i,
            id: stopPoints.length,
            type: 'invisible'
        });
    }
    return stopPoints;
};

// Global invisible stop points
const INVISIBLE_STOP_POINTS = createInvisibleStopPoints();
export const initializeBuses = (settings, lanes, scaleFactor) => {
    const buses = [];

    // DEBUG: Log the settings to see what's being passed
    console.log('Bus initialization settings:', settings);
    console.log('Bus schedule setting:', settings.busSchedule); // Changed from busFrequency to busSchedule

    // Calculate bus schedule interval based on settings
    // Map real-time intervals to simulation time
    let busScheduleInterval;

    // Fixed to match the actual settings values: '10mins', '20mins', '30mins'
    if (settings.busSchedule === '10mins') {
        busScheduleInterval = 10000; // 10 seconds simulation time = 10 minutes real time
        console.log('Setting bus interval to 10 seconds (every 10 mins)');
    } else if (settings.busSchedule === '20mins') {
        busScheduleInterval = 20000; // 20 seconds simulation time = 20 minutes real time
        console.log('Setting bus interval to 20 seconds (every 20 mins)');
    } else if (settings.busSchedule === '30mins') {
        busScheduleInterval = 30000; // 30 seconds simulation time = 30 minutes real time
        console.log('Setting bus interval to 30 seconds (every 30 mins)');
    } else {
        // Default fallback - also log what value we received
        console.warn('Unknown bus schedule setting:', settings.busSchedule, 'defaulting to 10 seconds');
        busScheduleInterval = 10000;
    }

    console.log('Final bus schedule interval:', busScheduleInterval, 'ms');

    // Create the first bus and activate it immediately
    buses.push(createBus(0, 0, settings, scaleFactor, true));
    console.log('Created first bus immediately');

    // Create remaining buses as inactive and schedule their activation
    for (let i = 1; i < settings.busCount; i++) {
        buses.push(createBus(i, -0.1, settings, scaleFactor, false));
        const delay = i * busScheduleInterval;
        console.log(`Scheduling bus ${i + 1} to activate in ${delay}ms`);

        setTimeout(() => {
            if (buses[i]) {
                buses[i].active = true;
                buses[i].pathPosition = 0;
                console.log(`Bus ${i + 1} activated after ${delay}ms delay`);
            }
        }, delay);
    }

    return buses;
};

const createBus = (index, pathPosition, settings, scaleFactor, active = true) => {
    // If there's no bus lane, assign lane with weighted probability (favor lanes 0 and 1)
    // If there is a bus lane, always use lane 0
    let laneIndex;
    if (settings.hasBusLane) {
        laneIndex = 0;
    } else {
        // Weighted lane selection: 40% lane 0, 40% lane 1, 20% lane 2
        const random = Math.random();
        if (random < 0.4) {
            laneIndex = 0;
        } else if (random < 0.8) {
            laneIndex = 1;
        } else {
            laneIndex = 2;
        }
    }

    // Calculate bus speed for 2.6km in 3 minutes (adjusted for simulation time)
    const baseSpeed = 14.44 * (10 / 180);
    const speed = baseSpeed * scaleFactor;

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
        throughput: 0,
        shouldStopAtStations: settings.hasBusLane,

        // Enhanced lane changing properties
        laneChangeProgress: 1.0,
        laneChangeTimer: 0,
        targetLane: laneIndex,
        laneChangeDuration: 2500, // Smooth lane changes for buses
        laneChangeCooldown: 3000,
        stuckTimer: 0,
        behaviorType: 'neutral',
        desiredSpeed: speed,
        preferredLane: laneIndex, // Remember preferred lane

        // Properties for invisible stop behavior
        nextInvisibleStop: null, // Which invisible stop to target next
        isSeekingInvisibleStop: false, // Whether actively seeking an invisible stop
        invisibleStopDecisionRange: 0.05, // How close to make stop decision (5% of path)
        lastInvisibleStopPosition: -1, // Track last invisible stop position
        randomStopProbability: 0.5, // 50% base chance to stop at any invisible point

        // NEW: Stop management properties - MODIFIED for lane 2 stopping requirement
        stopsThisCycle: 0, // Count stops made in current cycle
        maxStopsPerCycle: Math.floor(INVISIBLE_STOP_POINTS.length * 0.6), // Max 60% of available stops
        hasStoppedThisCycle: false, // Track if bus has stopped at least once
        mustStopSoon: false, // Flag when bus must stop to meet minimum requirement
        // NEW: Cycle progress tracking for mandatory stops
        cycleProgressWhenMustStop: 0.7, // If no stop by 70% of cycle, force a stop

        // NEW: Lane 2 tracking properties
        hasBeenInLane2: false, // Track if bus has ever been in lane 2 this cycle
        hasStoppedInLane2: false, // Track if bus has stopped in lane 2 this cycle
        mustStopInLane2: false, // Flag when bus must stop in lane 2 before cycle ends

        // Properties for visible bus stops (existing system)
        nextStopDecision: null,
        isSeekingStop: false,
        stopProbability: 0.95,
        hasPassengersToAlight: false,
        passengerAlightingTimer: 0,

        // Lane management for passenger stops - MODIFIED
        originalLane: laneIndex, // Track original lane for potential return
        needsToReturnToOriginalLane: false, // Flag to return after stop
        spawnedInLane2: laneIndex === 2, // Track if bus originally spawned in lane 2
        // REMOVED: Force lane 2 stopping for mixed traffic - now buses can stop in any lane
        // NEW: Track lane 2 usage instead
        everEnteredLane2: laneIndex === 2, // Track if bus has ever been in lane 2
        rotation: 0,           // Current rotation angle in radians
        baseRotation: 0,       // Base rotation from road curve
        laneChangeRotation: 0, // Additional rotation from lane change
        maxLaneChangeAngle: Math.PI / 12, // Maximum 15 degrees for buses (less than cars)
    };
};

// MODIFIED: Function to determine if bus should stop at an invisible stop point
const shouldStopAtInvisiblePoint = (bus, invisibleStop) => {
    // Don't stop if just left another stop recently
    if (bus.justLeftStop) return false;

    // Don't stop if already seeking a visible bus stop
    if (bus.isSeekingStop) return false;

    // Don't stop at the same position again (but allow closer stops)
    if (Math.abs(bus.lastInvisibleStopPosition - invisibleStop.pathPosition) < 0.015) return false;

    // LANE 2 REQUIREMENT: If bus has been in lane 2 but hasn't stopped there yet, prioritize lane 2 stops
    if (bus.hasBeenInLane2 && !bus.hasStoppedInLane2 && bus.lane === 2) {
        console.log(`Bus ${bus.busId} MUST stop in lane 2 - has been in lane 2 but not stopped there yet`);
        return true;
    }

    // If bus must stop in lane 2 and is approaching end of cycle, force stop in lane 2
    if (bus.mustStopInLane2 && bus.lane === 2 && bus.pathPosition > 0.8) {
        console.log(`Bus ${bus.busId} FORCED to stop in lane 2 before cycle ends`);
        return true;
    }

    // MANDATORY STOP LOGIC: If bus hasn't stopped this cycle and is past 70% of cycle
    if (!bus.hasStoppedThisCycle && bus.pathPosition > bus.cycleProgressWhenMustStop) {
        bus.mustStopSoon = true;
        console.log(`Bus ${bus.busId} MUST stop soon - no stops yet at ${(bus.pathPosition * 100).toFixed(1)}% cycle progress`);
        return true;
    }

    // If bus must stop soon due to cycle requirements
    if (bus.mustStopSoon) {
        return true;
    }

    // High probability to stop - simulates frequent passenger requests
    const baseStopChance = Math.random() < bus.randomStopProbability;

    // Even higher chance if bus has many passengers
    const passengerFactor = bus.passengers > 30 ? 1.3 : 1.0;

    // Sometimes stop even with low probability for realism
    const randomFactor = Math.random() < 0.2; // 20% additional chance

    return (baseStopChance * passengerFactor) > 0.4 || randomFactor;
};

// MODIFIED: Function to determine if bus should stop at a visible bus stop
const shouldBusStopAtStation = (bus, stopIndex, busStops) => {
    // Always stop if in dedicated bus lane
    if (bus.shouldStopAtStations) {
        return true;
    }

    // LANE 2 REQUIREMENT: If bus has been in lane 2 but hasn't stopped there yet, prioritize lane 2 stops
    if (bus.hasBeenInLane2 && !bus.hasStoppedInLane2 && bus.lane === 2) {
        console.log(`Bus ${bus.busId} MUST stop at visible station ${stopIndex} in lane 2 - requirement not met yet`);
        return true;
    }

    // If bus must stop in lane 2 and is in lane 2, force stop
    if (bus.mustStopInLane2 && bus.lane === 2) {
        console.log(`Bus ${bus.busId} FORCED to stop at visible station ${stopIndex} in lane 2`);
        return true;
    }

    // MANDATORY STOP LOGIC: If bus hasn't stopped this cycle and is past 70% of cycle
    if (!bus.hasStoppedThisCycle && bus.pathPosition > bus.cycleProgressWhenMustStop) {
        bus.mustStopSoon = true;
        console.log(`Bus ${bus.busId} MUST stop at visible station ${stopIndex} - no stops yet this cycle`);
        return true;
    }

    // If bus must stop soon due to cycle requirements
    if (bus.mustStopSoon) {
        return true;
    }

    // ENFORCE MAXIMUM: Don't stop if already at 60% limit
    if (bus.stopsThisCycle >= bus.maxStopsPerCycle) {
        console.log(`Bus ${bus.busId} skipping visible stop ${stopIndex} - at maximum stops (${bus.stopsThisCycle}/${bus.maxStopsPerCycle})`);
        return false;
    }

    // For mixed traffic, high probability of stopping at visible bus stops
    const hasPassengersWanting = Math.random() < 0.85;
    const stopHasWaitingPassengers = busStops[stopIndex].waitingPassengers > 0;
    const hasSpaceForPassengers = bus.passengers < bus.capacity * 0.9;

    return (hasPassengersWanting || stopHasWaitingPassengers) && hasSpaceForPassengers && Math.random() < 0.9;
};

// Regular lane changing function for buses (between all lanes)
const tryChangeBusLane = (bus, vehicles, buses, lanes) => {
    if (bus.laneChangeProgress < 1.0) return false;
    if (bus.laneChangeTimer > 0) return false;

    // Can change to any lane for normal travel
    const possibleLanes = [0, 1, 2].filter(laneIndex => laneIndex !== bus.lane);

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

        if (laneScore > bestLaneScore + 0.5) {
            bestLane = targetLane;
            bestLaneScore = laneScore;
        }
    }

    if (bestLane !== bus.lane) {
        if (Math.random() < 0.3) {
            bus.targetLane = bestLane;
            bus.laneChangeProgress = 0.0;
            bus.laneChangeTimer = bus.laneChangeCooldown;
            return true;
        }
    }

    return false;
};

// Function to return bus to original lane after passenger stop
const tryReturnToOriginalLane = (bus, vehicles, buses, lanes) => {
    if (bus.laneChangeProgress < 1.0) return false;
    if (bus.laneChangeTimer > 0) return false;
    if (bus.lane === bus.originalLane) {
        bus.needsToReturnToOriginalLane = false;
        return false;
    }

    // Try to return to original lane
    if (!isLaneChangeSafe(bus, [...vehicles, ...buses], bus.originalLane)) {
        // If can't return directly, try intermediate lane
        const intermediateLanes = [];
        if (bus.lane > bus.originalLane) {
            for (let i = bus.lane - 1; i > bus.originalLane; i--) {
                intermediateLanes.push(i);
            }
        }

        for (const intermediateLane of intermediateLanes) {
            if (isLaneChangeSafe(bus, [...vehicles, ...buses], intermediateLane)) {
                bus.targetLane = intermediateLane;
                bus.laneChangeProgress = 0.0;
                bus.laneChangeTimer = 500;
                console.log(`Bus ${bus.busId} returning to intermediate lane ${intermediateLane} (target: ${bus.originalLane})`);
                return true;
            }
        }
        return false;
    }

    // Direct return to original lane
    bus.targetLane = bus.originalLane;
    bus.laneChangeProgress = 0.0;
    bus.laneChangeTimer = 500;
    console.log(`Bus ${bus.busId} returning to original lane ${bus.originalLane} from lane ${bus.lane}`);
    return true;
};

// MODIFIED: Simplified lane changing function - buses can now stop in any lane
const tryChangeBusLaneToStop = (bus, vehicles, buses, lanes, targetLane = 2) => {
    if (bus.laneChangeProgress < 1.0) return false;
    if (bus.laneChangeTimer > 0) return false;
    if (bus.lane === targetLane) return false;

    // Store original lane if not already stored
    if (!bus.needsToReturnToOriginalLane) {
        bus.originalLane = bus.lane;
        bus.needsToReturnToOriginalLane = true;
    }

    // Normal lane changing for stop-seeking buses
    if (!isLaneChangeSafe(bus, [...vehicles, ...buses], targetLane)) {
        // Try intermediate lane if direct change isn't safe
        const intermediateLanes = [];
        if (bus.lane < targetLane) {
            for (let i = bus.lane + 1; i < targetLane; i++) {
                intermediateLanes.push(i);
            }
        } else {
            for (let i = bus.lane - 1; i > targetLane; i--) {
                intermediateLanes.push(i);
            }
        }

        for (const intermediateLane of intermediateLanes) {
            if (isLaneChangeSafe(bus, [...vehicles, ...buses], intermediateLane)) {
                bus.targetLane = intermediateLane;
                bus.laneChangeProgress = 0.0;
                bus.laneChangeTimer = 300;
                console.log(`Bus ${bus.busId} changing to intermediate lane ${intermediateLane} (target: lane ${targetLane})`);
                return true;
            }
        }
        return false;
    }

    // Global lane change limit
    const currentlyChangingLanes = [...vehicles, ...buses].filter(v =>
        v.laneChangeProgress < 1.0
    ).length;

    const maxSimultaneousChanges = Math.max(2, Math.ceil((vehicles.length + buses.length) * 0.08));
    if (currentlyChangingLanes >= maxSimultaneousChanges) {
        return false;
    }

    // Initiate lane change to target lane
    bus.targetLane = targetLane;
    bus.laneChangeProgress = 0.0;
    bus.laneChangeTimer = 300;
    console.log(`Bus ${bus.busId} changing from lane ${bus.lane} to lane ${targetLane} for passenger stop`);
    return true;
};

// Main update function
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

    // Update passenger waiting at stations
    const currentTime = Date.now();
    busStops.forEach(stop => {
        const timeDiff = (currentTime - stop.lastUpdateTime) / 1000;

        if (timeDiff >= 1) {
            const maxPassengers = updatedBuses.some(bus => bus.shouldStopAtStations) ? 20 : 10;
            const newPassengers = Math.floor(Math.random() * 3);
            stop.waitingPassengers = Math.min(stop.waitingPassengers + newPassengers, maxPassengers);
            stop.lastUpdateTime = currentTime;
        }
    });

    updatedBuses.forEach(bus => {
        if (!bus.active) return;

        // NEW: Track when bus enters lane 2 for the first time this cycle
        if (bus.lane === 2 && !bus.hasBeenInLane2) {
            bus.hasBeenInLane2 = true;
            console.log(`Bus ${bus.busId} has entered lane 2 for the first time this cycle - must stop in lane 2 before cycle ends`);
        }

        // NEW: Check if bus needs to stop in lane 2 before cycle ends
        if (bus.hasBeenInLane2 && !bus.hasStoppedInLane2 && bus.pathPosition > 0.85) {
            bus.mustStopInLane2 = true;
            console.log(`Bus ${bus.busId} is approaching end of cycle and hasn't stopped in lane 2 yet - marking as must stop`);
        }

        // Reset justLeftStop flag - shorter reset distance for more frequent stops
        if (bus.justLeftStop && bus.pathPosition > bus.lastInvisibleStopPosition + 0.02) {
            bus.justLeftStop = false;
        }

        // Handle buses currently stopped (both visible and invisible stops)
        if (bus.stoppedAtBusStop >= 0) {
            bus.stopTime += deltaTime;

            let passengersToDrop, passengersToPickUp, baseStopTime;

            if (bus.stoppedAtBusStop < busStops.length) {
                // Stopping at visible bus stop
                const currentStop = busStops[bus.stoppedAtBusStop];
                passengersToDrop = Math.min(bus.passengers, Math.floor(Math.random() * 20) + 10); //allows 10 to 20 passengers to alight
                const waitingPassengers = currentStop.waitingPassengers || 0;
                const availableSpace = bus.capacity - bus.passengers;
                passengersToPickUp = Math.min(waitingPassengers, availableSpace, Math.floor(Math.random() * 20 + 10));// 1 to 7 passngers
                baseStopTime = 800 + (passengersToDrop * 150) + (passengersToPickUp * 200);

                if (bus.stopTime >= baseStopTime) {
                    // Complete passenger operations for visible stop
                    bus.passengers -= passengersToDrop;
                    bus.passengers += passengersToPickUp;
                    currentStop.waitingPassengers = Math.max(0, waitingPassengers - passengersToPickUp);

                    if (onPassengersAlighted) {
                        onPassengersAlighted(passengersToDrop);
                    }

                    bus.lastVisitedStop = bus.stoppedAtBusStop;
                    bus.stoppedAtBusStop = -1;
                    bus.stopTime = 0;
                    bus.justLeftStop = true;
                    bus.isSeekingStop = false;
                    bus.nextStopDecision = null;
                    // Mark that bus needs to return to original lane after stop
                    bus.needsToReturnToOriginalLane = true;
                    // UPDATE: Track stops for cycle management (visible stops also count)
                    bus.stopsThisCycle += 1;
                    bus.hasStoppedThisCycle = true;
                    bus.mustStopSoon = false; // Reset the urgent stop flag

                    // For dedicated bus lane, all stops count as lane 2 stops since buses are in lane 0
                    if (bus.shouldStopAtStations) {
                        console.log(`Bus ${bus.busId} finished dedicated lane stop at station ${bus.lastVisitedStop} (${bus.stopsThisCycle} stops this cycle)`);
                    } else {
                        // NEW: Track if bus stopped in lane 2 for passengers (mixed traffic only)
                        if (bus.lane === 2) {
                            bus.hasStoppedInLane2 = true;
                            bus.mustStopInLane2 = false;
                            console.log(`Bus ${bus.busId} finished passenger stop in lane 2 - requirement fulfilled! (${bus.stopsThisCycle}/${bus.maxStopsPerCycle} passenger stops this cycle)`);
                        } else {
                            // This should not happen with new logic, but keep for safety
                            console.error(`ERROR: Bus ${bus.busId} somehow stopped for passengers in lane ${bus.lane} instead of lane 2!`);
                        }
                    }
                }
            } else {
                // Stopping at invisible stop point - VERY SHORT STOPS
                passengersToDrop = Math.min(bus.passengers, Math.floor(Math.random() * 4) + 1);
                passengersToPickUp = Math.floor(Math.random() * 8 + 2); // Range between 2 and 8
                baseStopTime = 500 + (passengersToDrop * 50) + (passengersToPickUp * 80); // VERY SHORT - 200-600ms

                if (bus.stopTime >= baseStopTime) {
                    // Complete passenger operations for invisible stop
                    bus.passengers = Math.max(0, bus.passengers - passengersToDrop);
                    bus.passengers = Math.min(bus.capacity, bus.passengers + passengersToPickUp);

                    if (onPassengersAlighted) {
                        onPassengersAlighted(passengersToDrop);
                    }

                    bus.lastInvisibleStopPosition = bus.pathPosition;
                    bus.stoppedAtBusStop = -1;
                    bus.stopTime = 0;
                    bus.justLeftStop = true;
                    bus.isSeekingInvisibleStop = false;
                    bus.nextInvisibleStop = null;
                    // Mark that bus needs to return to original lane after stop
                    bus.needsToReturnToOriginalLane = true;
                    // UPDATE: Track stops for cycle management
                    bus.stopsThisCycle += 1;
                    bus.hasStoppedThisCycle = true;
                    bus.mustStopSoon = false; // Reset the urgent stop flag

                    // For dedicated bus lane, invisible stops count since buses are in dedicated lane 0
                    if (bus.shouldStopAtStations) {
                        console.log(`Bus ${bus.busId} finished quick dedicated lane stop (${baseStopTime}ms), dropped ${passengersToDrop} passengers at position ${bus.pathPosition.toFixed(2)} (${bus.stopsThisCycle} stops this cycle)`);
                    } else {
                        // NEW: Track if bus stopped in lane 2 for passengers (mixed traffic only)
                        if (bus.lane === 2) {
                            bus.hasStoppedInLane2 = true;
                            bus.mustStopInLane2 = false;
                            console.log(`Bus ${bus.busId} finished quick passenger stop in lane 2 - requirement fulfilled! (${baseStopTime}ms), dropped ${passengersToDrop} passengers at position ${bus.pathPosition.toFixed(2)} (${bus.stopsThisCycle}/${bus.maxStopsPerCycle} passenger stops this cycle)`);
                        } else {
                            // This should not happen with new logic, but keep for safety
                            console.error(`ERROR: Bus ${bus.busId} somehow stopped for passengers in lane ${bus.lane} instead of lane 2!`);
                        }
                    }
                }
            }
        } else {
            // Bus is moving - handle stop detection and lane changing
            if (!bus.shouldStopAtStations) {
                // MIXED TRAFFIC MODE - buses must reach lane 2 for passenger operations

                // Check for invisible stop points first (higher priority for realistic behavior)
                // ONLY consider stopping for passenger operations if in lane 2 or can reach lane 2
                if (!bus.isSeekingStop && !bus.isSeekingInvisibleStop && !bus.justLeftStop) {
                    INVISIBLE_STOP_POINTS.forEach((invisibleStop) => {
                        if (bus.isSeekingInvisibleStop) return; // Already found a stop to target

                        const distanceToStop = invisibleStop.pathPosition - bus.pathPosition;

                        // Check if approaching this invisible stop (only look ahead)
                        if (distanceToStop > 0 && distanceToStop < bus.invisibleStopDecisionRange) {
                            if (shouldStopAtInvisiblePoint(bus, invisibleStop)) {
                                bus.isSeekingInvisibleStop = true;
                                bus.nextInvisibleStop = invisibleStop;
                                console.log(`Bus ${bus.busId} deciding to make passenger stop at invisible point ${invisibleStop.pathPosition.toFixed(2)}, currently in lane ${bus.lane}, MUST reach lane 2`);

                                // MANDATORY: Must try to get to lane 2 for passenger operations
                                if (bus.lane !== 2 && bus.laneChangeProgress >= 1.0) {
                                    tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                                }
                            }
                        }
                    });
                }

                // Handle invisible stop approach and stopping - ONLY allow passenger operations in lane 2
                if (bus.isSeekingInvisibleStop && bus.nextInvisibleStop) {
                    const distanceToInvisibleStop = bus.nextInvisibleStop.pathPosition - bus.pathPosition;

                    // Continuously try to reach lane 2 for passenger operations
                    if (distanceToInvisibleStop > 0 && distanceToInvisibleStop < 0.05 && bus.lane !== 2) {
                        if (bus.laneChangeProgress >= 1.0) {
                            tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                        }
                    }

                    // ONLY allow passenger stop in lane 2
                    if (distanceToInvisibleStop <= 0.005 && distanceToInvisibleStop >= -0.005) {
                        if (bus.lane === 2) {
                            // Passenger stop - only allowed in lane 2
                            bus.stoppedAtBusStop = 9999; // Use high number to indicate invisible stop
                            bus.stopTime = 0;
                            bus.waiting = true;
                            console.log(`Bus ${bus.busId} making passenger stop at invisible point in lane 2`);
                        } else {
                            // Not in lane 2, keep trying to reach it
                            if (bus.laneChangeProgress >= 1.0) {
                                tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                            }
                        }
                    }

                    // FALLBACK: If bus has passed the stop and still not in lane 2, give up on this stop
                    if (distanceToInvisibleStop < -0.005) {
                        if (bus.lane !== 2) {
                            bus.isSeekingInvisibleStop = false;
                            bus.nextInvisibleStop = null;
                            console.log(`Bus ${bus.busId} missed invisible passenger stop (couldn't reach lane 2), continuing`);
                        } else {
                            // In lane 2 but passed stop - still make the stop for passengers
                            bus.stoppedAtBusStop = 9999;
                            bus.stopTime = 0;
                            bus.waiting = true;
                            console.log(`Bus ${bus.busId} making late passenger stop at invisible point in lane 2`);
                        }
                    }
                }

                // Check for visible bus stops (existing logic) - MODIFIED to enforce lane 2
                busStops.forEach((stop, stopIndex) => {
                    if (stopIndex === bus.lastVisitedStop || bus.justLeftStop || bus.isSeekingInvisibleStop) return;

                    const busPos = bus.x;
                    const stopPos = stop.x;
                    const detectionDistance = bus.width * 0.6;
                    const stoppingDistance = bus.width * 0.15;

                    // Early detection for lane changing decision
                    if (busPos < stopPos && (stopPos - busPos) < detectionDistance && (stopPos - busPos) > stoppingDistance) {
                        if (!bus.isSeekingStop && shouldBusStopAtStation(bus, stopIndex, busStops)) {
                            bus.isSeekingStop = true;
                            bus.nextStopDecision = stopIndex;
                            console.log(`Bus ${bus.busId} deciding to stop for passengers at visible station ${stopIndex}, currently in lane ${bus.lane}, MUST reach lane 2`);

                            // MANDATORY: Must try to get to lane 2 for passenger operations
                            if (bus.lane !== 2 && bus.laneChangeProgress >= 1.0) {
                                tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                            }
                        }
                    }

                    // Actual stopping logic for visible stops - ONLY allow passenger operations in lane 2
                    const isApproachingFromLeft = busPos < stopPos && (stopPos - busPos) < stoppingDistance;
                    if (isApproachingFromLeft && bus.isSeekingStop && bus.nextStopDecision === stopIndex) {
                        if (bus.lane === 2) {
                            // Only allow passenger stop in lane 2
                            const busLane = lanes[bus.lane];
                            const laneY = getPositionOnPath(busLane.points, bus.pathPosition).y;

                            if (Math.abs(laneY - stop.y) < bus.height * 1.5) {
                                bus.stoppedAtBusStop = stopIndex;
                                bus.stopTime = 0;
                                bus.waiting = true;
                                console.log(`Bus ${bus.busId} stopping for passengers at visible station ${stopIndex} in lane 2`);
                            }
                        } else {
                            // Not in lane 2, keep trying to reach it
                            if (bus.laneChangeProgress >= 1.0) {
                                tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                            }
                        }
                    }

                    // FALLBACK: If bus has passed the visible stop and still not in lane 2
                    const hasPassedStop = busPos > stopPos + (bus.width * 0.5);
                    if (hasPassedStop && bus.isSeekingStop && bus.nextStopDecision === stopIndex) {
                        if (bus.lane !== 2) {
                            // Give up on this passenger stop
                            bus.isSeekingStop = false;
                            bus.nextStopDecision = null;
                            console.log(`Bus ${bus.busId} missed visible passenger stop ${stopIndex} (couldn't reach lane 2), continuing`);
                        }
                    }
                });

                // Early lane changing attempt for stop-seeking buses - prioritize reaching lane 2
                if ((bus.isSeekingStop || bus.isSeekingInvisibleStop) && bus.lane !== 2 && bus.laneChangeProgress >= 1.0) {
                    // Continuously try to reach lane 2 when seeking passenger stops
                    tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                }

                // Check if bus needs to return to original lane after passenger stop
                if (bus.needsToReturnToOriginalLane && !bus.isSeekingStop && !bus.isSeekingInvisibleStop && !bus.justLeftStop) {
                    if (bus.lane !== bus.originalLane) {
                        console.log(`Bus ${bus.busId} attempting to return from lane ${bus.lane} to original lane ${bus.originalLane}`);
                        tryReturnToOriginalLane(bus, vehicles, updatedBuses, lanes);
                    } else {
                        bus.needsToReturnToOriginalLane = false;
                        console.log(`Bus ${bus.busId} successfully returned to original lane ${bus.originalLane}`);
                    }
                }

                // Regular lane changing for non-stop-seeking behavior (all lanes available)
                if (!bus.isSeekingStop && !bus.isSeekingInvisibleStop && !bus.needsToReturnToOriginalLane &&
                    bus.laneChangeProgress >= 1.0 && Math.random() < 0.0002) { // Slightly higher chance for more lane changing
                    tryChangeBusLane(bus, vehicles, updatedBuses, lanes);
                }
            } else {
                // DEDICATED BUS LANE MODE - buses stay in lane 0 and stop at all visible stations
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
                            if (bus.passengers < bus.capacity || stop.waitingPassengers > 0) {
                                bus.stoppedAtBusStop = stopIndex;
                                bus.stopTime = 0;
                                bus.waiting = true;
                                console.log(`Bus ${bus.busId} stopping at dedicated lane station ${stopIndex}`);
                            }
                        }
                    }
                });
            }

            // Reset decisions when starting new cycle
            if (bus.pathPosition < 0.05) {
                if (bus.lastVisitedStop !== -1 || bus.lastInvisibleStopPosition !== -1) {
                    if (bus.shouldStopAtStations) {
                        // Dedicated bus lane - simpler logging
                        console.log(`Bus ${bus.busId} completed dedicated lane cycle with ${bus.stopsThisCycle} stops`);
                    } else {
                        // Mixed traffic - check lane 2 requirements
                        // LANE 2 REQUIREMENT CHECK: Warn if bus was in lane 2 but didn't stop there for passengers
                        if (bus.hasBeenInLane2 && !bus.hasStoppedInLane2) {
                            console.warn(`WARNING: Bus ${bus.busId} was in lane 2 this cycle but never stopped there for passengers! (${bus.stopsThisCycle} total passenger stops)`);
                        }

                        // MANDATORY STOP CHECK: Warn if bus didn't make any passenger stops
                        if (!bus.hasStoppedThisCycle) {
                            console.warn(`WARNING: Bus ${bus.busId} completed cycle WITHOUT any passenger stops! (${bus.stopsThisCycle} stops)`);
                        } else {
                            let statusMsg = `Bus ${bus.busId} completed cycle with ${bus.stopsThisCycle} passenger stops`;
                            if (bus.hasBeenInLane2 && bus.hasStoppedInLane2) {
                                statusMsg += " (✓ stopped for passengers in lane 2)";
                            } else if (bus.hasBeenInLane2) {
                                statusMsg += " (✗ was in lane 2 but didn't stop for passengers there)";
                            }
                            console.log(statusMsg);
                        }
                    }

                    bus.lastVisitedStop = -1;
                    bus.lastInvisibleStopPosition = -1;
                    bus.nextStopDecision = null;
                    bus.nextInvisibleStop = null;
                    bus.isSeekingStop = false;
                    bus.isSeekingInvisibleStop = false;
                    // Reset to original lane preference for new cycle
                    bus.originalLane = bus.preferredLane;
                    bus.needsToReturnToOriginalLane = false;

                    // RESET: Stop tracking for new cycle
                    bus.stopsThisCycle = 0;
                    bus.hasStoppedThisCycle = false;
                    bus.mustStopSoon = false;

                    if (!bus.shouldStopAtStations) {
                        // Only reset lane 2 tracking for mixed traffic
                        bus.hasBeenInLane2 = bus.lane === 2; // Reset but keep current state if starting in lane 2
                        bus.hasStoppedInLane2 = false;
                        bus.mustStopInLane2 = false;
                    }
                }
            }

            // NEW: Enhanced mandatory stop enforcement - check cycle progress AND lane 2 requirement (MIXED TRAFFIC ONLY)
            if (!bus.shouldStopAtStations && bus.pathPosition > bus.cycleProgressWhenMustStop && !bus.isSeekingStop && !bus.isSeekingInvisibleStop) {
                let needsToSeekStop = false;
                let reason = "";

                // Check if bus hasn't stopped at all this cycle
                if (!bus.hasStoppedThisCycle) {
                    needsToSeekStop = true;
                    reason = "no passenger stops yet this cycle";
                }

                // Check if bus has been in lane 2 but hasn't stopped there for passengers
                if (bus.hasBeenInLane2 && !bus.hasStoppedInLane2) {
                    needsToSeekStop = true;
                    reason = reason ? reason + " and hasn't stopped for passengers in lane 2" : "hasn't stopped for passengers in lane 2 yet";
                }

                if (needsToSeekStop) {
                    console.log(`Bus ${bus.busId} at ${(bus.pathPosition * 100).toFixed(1)}% cycle progress - forcing passenger stop seeking (${reason})`);
                    bus.mustStopSoon = true;

                    // Look for immediate stop opportunities - but only consider if can reach lane 2
                    INVISIBLE_STOP_POINTS.forEach((invisibleStop) => {
                        if (bus.isSeekingInvisibleStop) return;

                        const distanceToStop = invisibleStop.pathPosition - bus.pathPosition;
                        // Look for stops that are coming up soon (expanded range when mandatory)
                        if (distanceToStop > 0 && distanceToStop < 0.15) { // Expanded from 0.05 to 0.15
                            bus.isSeekingInvisibleStop = true;
                            bus.nextInvisibleStop = invisibleStop;
                            console.log(`Bus ${bus.busId} FORCED to target invisible passenger stop at ${invisibleStop.pathPosition.toFixed(2)} (${reason}) - MUST reach lane 2`);

                            // Immediately try to change to lane 2 for passenger operations
                            if (bus.lane !== 2 && bus.laneChangeProgress >= 1.0) {
                                tryChangeBusLaneToStop(bus, vehicles, updatedBuses, lanes, 2);
                            }
                        }
                    });
                }
            }

            // MOVEMENT AND COLLISION DETECTION - THIS IS CRITICAL FOR ALL BUSES
            let shouldWait = false;
            let vehicleAheadDistance = 1.0;

            [...updatedBuses, ...vehicles].forEach(otherVehicle => {
                if (!otherVehicle.active && otherVehicle.type === 'bus') return;
                if (bus !== otherVehicle && bus.lane === otherVehicle.lane) {
                    let distAhead = otherVehicle.pathPosition - bus.pathPosition;
                    if (distAhead < 0) distAhead += 1;
                    if (distAhead > 0 && distAhead < vehicleAheadDistance) {
                        vehicleAheadDistance = distAhead;
                    }
                    if (distAhead > 0 && distAhead < 0.08) {
                        if (distAhead < 0.03) {
                            shouldWait = true;
                        }
                    }
                }
            });

            if (bus.stoppedAtBusStop === -1) {
                bus.waiting = shouldWait;
            }

            // MOVEMENT LOGIC - THIS IS CRITICAL FOR ALL BUSES
            if (!bus.waiting) {
                let speedFactor = 0.00005 * (5000 / 2600);
                if (vehicleAheadDistance < 0.15) {
                    speedFactor *= Math.min(vehicleAheadDistance * 10, 0.8);
                }
                bus.pathPosition += bus.speed * speedFactor * deltaTime;
                if (bus.pathPosition > 1) {
                    bus.pathPosition = 0;
                    bus.lastVisitedStop = -1;
                    bus.nextStopDecision = null;
                    bus.isSeekingStop = false;
                }
            }
        }

        // Update lane change progress
        if (bus.laneChangeProgress < 1.0) {
            const progressIncrement = deltaTime / bus.laneChangeDuration;
            bus.laneChangeProgress = Math.min(1.0, bus.laneChangeProgress + progressIncrement);

            if (bus.laneChangeProgress >= 1.0) {
                bus.lane = bus.targetLane;
                bus.laneChangeTimer = bus.laneChangeCooldown;
                console.log(`Bus ${bus.busId} completed lane change to lane ${bus.lane}`);
            }
        }

        // Update timers
        if (bus.laneChangeTimer > 0) {
            bus.laneChangeTimer -= deltaTime;
        }
    });

    // Update vehicle positions
    updateVehiclePositions(updatedBuses.filter(bus => bus.active), lanes);

    // IMPORTANT: Apply smooth lane change interpolation AFTER position updates
    updatedBuses.forEach(bus => {
        if (!bus.active) return;

        if (bus.laneChangeProgress < 1.0 && bus.laneChangeProgress > 0.0) {
            // SMOOTH LANE CHANGE INTERPOLATION - prevents blinking
            const fromLane = bus.lane; // Original lane (not yet updated)
            const toLane = bus.targetLane; // Target lane

            // Get the positions for both lanes at current path position
            const fromLanePosition = getPositionOnPath(lanes[fromLane].points, bus.pathPosition);
            const toLanePosition = getPositionOnPath(lanes[toLane].points, bus.pathPosition);

            // Use smooth easing function for natural movement
            const progress = bus.laneChangeProgress;
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2; // Ease in-out

            // Interpolate Y position smoothly between lanes
            bus.y = fromLanePosition.y + (toLanePosition.y - fromLanePosition.y) * easeProgress;

            // Keep X position updated normally
            bus.x = fromLanePosition.x;

            // ADD THIS: Calculate lane change rotation
            bus.laneChangeRotation = calculateLaneChangeRotation(bus, fromLane, toLane, progress);
            bus.rotation = bus.baseRotation + bus.laneChangeRotation;
        }
    });

    // Normal lane alignment when not changing lanes
    updatedBuses.forEach(bus => {
        if (!bus.active) return;
        if (bus.stoppedAtBusStop < 0 && bus.laneChangeProgress >= 1.0) {
            const lane = lanes[bus.lane];
            const lanePosition = getPositionOnPath(lane.points, bus.pathPosition);
            const offsetY = bus.y - lanePosition.y;
            const edgeFactor = (bus.pathPosition < 0.05 || bus.pathPosition > 0.95) ? 0.2 : 0.1;
            if (Math.abs(offsetY) > 1) {
                bus.y += (lanePosition.y - bus.y) * edgeFactor;
            }
        }
    });

    return updatedBuses;
};