// Canvas dimensions - landscape orientation with longer road
export const CANVAS_WIDTH = 5000;  // Much wider than before
export const CANVAS_HEIGHT = 800;  // Taller for better proportions

// Road length in meters (2.6km = 2600m)
export const ROAD_LENGTH_METERS = 2600;

// Define bus stop positions - for longer landscape orientation
export const BUS_STOPS = [
    { x: 750, y: 150, radius: 40 },     // First bus stop - adjusted y to match bus lane
    { x: 1750, y: 150, radius: 40 },    // Second bus stop - adjusted y to match bus lane
    { x: 2800, y: 140, radius: 40 },    // Third bus stop - adjusted y to match bus lane
    { x: 3900, y: 120, radius: 40 }     // Fourth bus stop - adjusted y to match bus lane
];

// THINNER LANES - reduced spacing between lanes to make them appear to fit only one car
export const LANES = [
    {
        name: 'busLane', points: [
            { x: 20, y: 180 },           // Left (start)
            { x: 800, y: 150 },
            { x: 1650, y: 150 },
            { x: 2500, y: 150 },
            { x: 3100, y: 140 },
            { x: 3800, y: 120 },
            { x: 4400, y: 90 },
            { x: 4800, y: 70 }          // Right (end)
        ]
    },
    {
        name: 'regularLane1', points: [
            { x: 20, y: 280 },           // Left (start) - moved up from 350 to 250
            { x: 800, y: 250 },
            { x: 1650, y: 270 },
            { x: 2500, y: 270 },
            { x: 3100, y: 250 },
            { x: 3800, y: 230 },
            { x: 4400, y: 210 },
            { x: 4800, y: 190 }         // Right (end)
        ]
    },
    {
        name: 'regularLane2', points: [
            { x: 20, y: 350 },           // Left (start) - moved up from 550 to 350
            { x: 800, y: 350 },
            { x: 1650, y: 350 },
            { x: 2500, y: 350 },
            { x: 3100, y: 340 },
            { x: 3800, y: 320 },
            { x: 4400, y: 290 },
            { x: 4800, y: 270 }         // Right (end)
        ]
    }
];

// Road path coordinates for rendering - adjusted for thinner lanes
export const ROAD_MAIN_PATH = [
    { x: 0, y: 200 },               // Top-left corner - moved from 250 to 200
    { x: 0, y: 400 },               // Bottom-left corner - moved from 650 to 400
    { x: 800, y: 380 },
    { x: 1650, y: 400 },
    { x: 2500, y: 400 },
    { x: 3100, y: 390 },
    { x: 3800, y: 370 },
    { x: 4400, y: 340 },
    { x: 4800, y: 320 },             // Bottom-right corner
    { x: 4800, y: 70 },              // Top-right corner
    { x: 4400, y: 90 },
    { x: 3800, y: 120 },
    { x: 3100, y: 140 },
    { x: 2500, y: 150 },
    { x: 1650, y: 150 },
    { x: 800, y: 150 },
    { x: 0, y: 200 }                // Back to top-left
];

// Bus lane path coordinates for rendering - adjusted for thinner lanes
export const BUS_LANE_PATH = [
    { x: 0, y: 250 },               // Moved from 350 to 250
    { x: 800, y: 210 },
    { x: 1650, y: 230 },
    { x: 2500, y: 230 },
    { x: 3100, y: 220 },
    { x: 3800, y: 200 },
    { x: 4400, y: 170 },
    { x: 4800, y: 150 },
    { x: 4800, y: 10 },
    { x: 4400, y: 40 },
    { x: 3800, y: 70 },
    { x: 3100, y: 90 },
    { x: 2500, y: 100 },
    { x: 1650, y: 100 },
    { x: 800, y: 100 },
    { x: 0, y: 150 }
];

// First lane divider (between bus lane and regular lane) - adjusted for thinner lanes
export const FIRST_LANE_DIVIDER = [
    { x: 0, y: 250 },              // Moved from 350 to 250
    { x: 800, y: 210 },
    { x: 1650, y: 230 },
    { x: 2500, y: 230 },
    { x: 3100, y: 220 },
    { x: 3800, y: 200 },
    { x: 4400, y: 170 },
    { x: 4800, y: 150 }
];

// Second lane divider (between regular lanes) - adjusted for thinner lanes
export const SECOND_LANE_DIVIDER = [
    { x: 0, y: 320 },              // Moved from 470 to 350
    { x: 800, y: 290 },
    { x: 1650, y: 310 },
    { x: 2500, y: 320 },
    { x: 3100, y: 310 },
    { x: 3800, y: 290 },
    { x: 4400, y: 260 },
    { x: 4800, y: 230 }
];

// Left edge of the road - adjusted for thinner lanes
export const LEFT_EDGE = [
    { x: 0, y: 150 },
    { x: 800, y: 100 },
    { x: 1650, y: 100 },
    { x: 2500, y: 100 },
    { x: 3100, y: 90 },
    { x: 3800, y: 70 },
    { x: 4400, y: 40 },
    { x: 4800, y: 10 }
];

// Right edge of the road - adjusted for thinner lanes
export const RIGHT_EDGE = [
    { x: 0, y: 400 },              // Moved from 650 to 400
    { x: 800, y: 380 },
    { x: 1650, y: 400 },
    { x: 2500, y: 400 },
    { x: 3100, y: 390 },
    { x: 3800, y: 370 },
    { x: 4400, y: 340 },
    { x: 4800, y: 320 }
];

// Colors
export const COLORS = {
    ROAD: '#CCCCCC',               // Light gray for regular road
    BUS_LANE: '#F7D358',           // Yellow for bus lane
    LANE_DIVIDER_SOLID: '#000000', // Black for solid lane divider
    LANE_DIVIDER_DOTTED: '#FFFFFF', // White for dotted lane divider
    BUS_STOP_RING: '#8B4513',      // Brown for bus stop ring
    BUS_STOP_CENTER: '#FFFFFF',    // White for bus stop center
    BUS_COLOR: '#219ebc',          // Blue for buses
    HEADLIGHTS: '#ffff99',         // Yellow for headlights
    BRAKE_LIGHTS: '#ff0000',       // Red for brake lights
    WINDOWS: '#cceeff',            // Light blue for windows
    STOP_INDICATOR: '#ff0000',     // Red for stop indicator
    STOP_TEXT: '#ffffff'           // White for stop text
};

// Car colors
export const CAR_COLORS = [
    '#ff4d4d', // Red
    '#3366ff', // Blue
    '#33cc33', // Green
    '#ffcc00', // Yellow
    '#ff9966', // Orange
    '#9966ff'  // Purple
];

// Vehicle dimensions - real world in meters
export const CAR_LENGTH_METERS = 4.5;
export const CAR_WIDTH_METERS = 2.5;
export const BUS_LENGTH_METERS = 12;
export const BUS_WIDTH_METERS = 2.5;

// Increase the visibility multiplier to make vehicles appear larger
export const VEHICLE_VISIBILITY_FACTOR = 5.8; // Increased slightly to 5.5 to make vehicles fit lane width

// Passenger throughput constants
export const TICK_DURATION = 10000; // 10 seconds per tick
export const PASSENGERS_PER_CAR = 3; // 3 passengers per car
export const BUS_CAPACITY = 90; // Maximum bus capacity
export const BUS_STOP_PASSENGER_RATE = 5; // Maximum passengers per second at bus stops