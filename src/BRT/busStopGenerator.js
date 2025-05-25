import { LANES } from './constants';

// Helper function to interpolate between two points
const lerp = (a, b, t) => a + (b - a) * t;

// Function to get a random point between two points
const getRandomPointBetween = (p1, p2) => {
  const t = Math.random();
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t)
  };
};

// Generate 8 random bus stops along regularLane2
export const generateRandomBusStopsOnLane = (lane, count = 8, radius = 40) => {
  const busStops = [];

  for (let i = 0; i < count; i++) {
    // Choose a random segment between points along the lane
    const segmentIndex = Math.floor(Math.random() * (lane.points.length - 1));
    const p1 = lane.points[segmentIndex];
    const p2 = lane.points[segmentIndex + 1];

    // Get random interpolated position
    const pos = getRandomPointBetween(p1, p2);

    // Calculate approximate pathPosition normalized along lane points (optional approximation)
    // Here pathPosition is approximated as the fraction along lane points (segment index + t) / total segments
    const t = Math.random(); // again for interpolation
    const pathPosition = (segmentIndex + t) / (lane.points.length - 1);

    busStops.push({
      x: pos.x,
      y: pos.y,
      radius,
      pathPosition
    });
  }

  return busStops;
};
