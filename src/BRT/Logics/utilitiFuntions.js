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

            // ENHANCED ANGLE CALCULATION FOR LANE CHANGES
            const fromDir = getDirectionOnPath(fromLane.points, vehicle.pathPosition);
            const toDir = getDirectionOnPath(toLane.points, vehicle.pathPosition);
            const fromAngle = Math.atan2(fromDir.y, fromDir.x);
            const toAngle = Math.atan2(toDir.y, toDir.x);

            // Handle angle wrapping for smooth interpolation
            let angleDiff = toAngle - fromAngle;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Add extra steering angle during lane change for more realistic turning
            const laneChangeDirection = vehicle.targetLane > vehicle.lane ? 1 : -1;
            const maxSteeringAngle = vehicle.type === 'bus' ? Math.PI / 12 : Math.PI / 8; // 15° for buses, 22.5° for cars
            const steeringAngle = Math.sin(easedT * Math.PI) * maxSteeringAngle * laneChangeDirection;

            vehicle.angle = fromAngle + angleDiff * easedT + steeringAngle;
        } else {
            // Normal positioning for vehicles not changing lanes
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
    // Safety checks for points array
    if (!points || points.length < 2) {
        console.warn('Invalid path points array:', points);
        return { x: 0, y: 0 };
    }

    t = Math.max(0, Math.min(1, t));
    const numSegments = points.length - 1;
    const segmentT = t * numSegments;
    const segmentIndex = Math.floor(segmentT);
    const segmentFraction = segmentT - segmentIndex;

    // Ensure we have valid points for interpolation
    const p0 = points[Math.max(0, segmentIndex - 1)] || points[0];
    const p1 = points[Math.min(segmentIndex, points.length - 1)] || points[0];
    const p2 = points[Math.min(segmentIndex + 1, points.length - 1)] || points[points.length - 1];
    const p3 = points[Math.min(segmentIndex + 2, points.length - 1)] || points[points.length - 1];

    // Ensure all points have x and y properties
    if (!p0 || !p1 || !p2 || !p3 ||
        typeof p0.x !== 'number' || typeof p0.y !== 'number' ||
        typeof p1.x !== 'number' || typeof p1.y !== 'number' ||
        typeof p2.x !== 'number' || typeof p2.y !== 'number' ||
        typeof p3.x !== 'number' || typeof p3.y !== 'number') {
        console.warn('Invalid point data in path:', { p0, p1, p2, p3 });
        return { x: 0, y: 0 };
    }

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