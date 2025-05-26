import {
    CAR_COLORS,
    CAR_LENGTH_METERS,
    CAR_WIDTH_METERS,
    VEHICLE_VISIBILITY_FACTOR,
    BEHAVIOR_TYPES,
} from '../constants';


/* ------------------------------ CAR SPAWNING ------------------------------ */

/**
 * Creates a new car object using the same settings as before.
 * New cars are spawned at the left side of the road (pathPosition = 0).
 */
export const createCar = (settings, lanes, scaleFactor) => {
    // Cars can use all lanes if there's no bus lane, otherwise only lanes 1 and 2
    const laneIndex = settings.hasBusLane ?
        (1 + Math.floor(Math.random() * 2)) : // Lanes 1 or 2 only
        Math.floor(Math.random() * 3); // Lanes 0, 1, or 2

    // Convert speed to match new simulation timing: 1 sim second = 1 real minute
    // Real time: 3.12 minutes for 2.6km at 50 km/h
    // New simulation time: 3.12 seconds (since 1 sim second = 1 real minute)
    // Base speed = 1 / 3.12 = 0.32 loops per simulation second
    const baseSpeed = 1 / 4.5; // One full loop takes 3.12 seconds in simulation time

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
        passengers: Math.floor(Math.random() * 3) + 1,
        throughput: 0,
        stuckTimer: 0,
        lastSpeed: speed * speedAdjustment,
        acceleration: 0,
        desiredSpeed: speed * speedAdjustment,
        // ADD THESE NEW ROTATION PROPERTIES:
        rotation: 0,           // Current rotation angle in radians
        baseRotation: 0,       // Base rotation from road curve
        laneChangeRotation: 0, // Additional rotation from lane change
        maxLaneChangeAngle: Math.PI / 8, // Maximum 22.5 degrees for lane changes
    };
};
