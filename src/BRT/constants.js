// Canvas dimensions - landscape orientation with longer road
export const CANVAS_WIDTH = 5000;  // Much wider than before
export const CANVAS_HEIGHT = 1000;  // Taller for better proportions

// Road length in meters (2.6km = 2600m)
export const ROAD_LENGTH_METERS = 2600;

// Define bus stop positions - for longer landscape orientation
export const BUS_STOPS = [
    { x: 250, y: 250, radius: 40, pathPosition: 0.15 },     // First bus stop
    { x: 1550, y: 300, radius: 40, pathPosition: 0.35 },    // Second bus stop
    { x: 2500, y: 270, radius: 40, pathPosition: 0.55 },    // Third bus stop
    { x: 3500, y: 240, radius: 40, pathPosition: 0.75 }     // Fourth bus stop
];

// THINNER LANES - reduced spacing between lanes to make them appear to fit only one car
export const LANES = [
    {
        name: 'busLane', points: [
            { x: 20, y: 200 },
            { x: 800, y: 330 },
            { x: 1650, y: 290 },
            { x: 2500, y: 260 },
            { x: 3100, y: 250 },
            { x: 3800, y: 250 },
            { x: 4400, y: 490 },
            { x: 4800, y: 640 }        // Right (end)
        ]
    },
    {
        name: 'regularLane1', points: [
            { x: 20, y: 290 },           // Left (start) - 100px below bus lane
            { x: 800, y: 440 },
            { x: 1650, y: 390 },
            { x: 2500, y: 370 },
            { x: 3100, y: 360 },
            { x: 3800, y: 360 },
            { x: 4400, y: 610 },
            { x: 4800, y: 740 }        // Right (end) - maintaining 120px spacing
        ]
    },
    {
        name: 'regularLane2', points: [
            { x: 20, y: 380 },           // Left (start) - 100px below lane 1
            { x: 800, y: 530 },
            { x: 1650, y: 510 },
            { x: 2500, y: 510 },
            { x: 3100, y: 510 },
            { x: 3800, y: 510 },
            { x: 4400, y: 710 },
            { x: 4800, y: 860 }         // Right (end) - maintaining 100px spacing
        ]
    }
];

// Road path coordinates for rendering - adjusted for thinner lanes
export const ROAD_MAIN_PATH = [
    { x: 0, y: 200 },               // Top-left corner - moved from 250 to 200
    { x: 0, y: 420 },               // Bottom-left corner - moved from 650 to 400
    { x: 800, y: 580 },
    { x: 1650, y: 550 },
    { x: 2500, y: 550 },
    { x: 3100, y: 550 },
    { x: 3800, y: 550 },
    { x: 4400, y: 770 },
    { x: 4800, y: 900 },            // Bottom-right corner
    { x: 4800, y: 600 },
    { x: 4400, y: 450 },
    { x: 3800, y: 190 },
    { x: 3100, y: 200 },
    { x: 2500, y: 230 },
    { x: 1650, y: 250 },
    { x: 800, y: 300 },
    { x: 0, y: 200 }                // Back to top-left
];

// Bus lane path coordinates for rendering - adjusted for thinner lanes
export const BUS_LANE_PATH = [
    { x: 0, y: 250 },               // Moved from 350 to 250
    { x: 800, y: 400 },
    { x: 1650, y: 350 },
    { x: 2500, y: 330 },
    { x: 3100, y: 320 },
    { x: 3800, y: 300 },
    { x: 4400, y: 570 },
    { x: 4800, y: 700 },
    { x: 4800, y: 600 },
    { x: 4400, y: 450 },
    { x: 3800, y: 190 },
    { x: 3100, y: 200 },
    { x: 2500, y: 230 },
    { x: 1650, y: 250 },
    { x: 800, y: 300 },
    { x: 0, y: 150 }
];

// First lane divider (between bus lane and regular lane) - adjusted for thinner lanes
export const FIRST_LANE_DIVIDER = [
    { x: 0, y: 250 },              // Moved from 350 to 250
    { x: 800, y: 400 },
    { x: 1650, y: 350 },
    { x: 2500, y: 330 },
    { x: 3100, y: 320 },
    { x: 3800, y: 300 },
    { x: 4400, y: 570 },
    { x: 4800, y: 700 }
];

// Second lane divider (between regular lanes) - adjusted for thinner lanes
export const SECOND_LANE_DIVIDER = [
    { x: 0, y: 330 },              // Moved from 470 to 350
    { x: 800, y: 500 },
    { x: 1650, y: 450 },
    { x: 2500, y: 440 },
    { x: 3100, y: 430 },
    { x: 3800, y: 410 },
    { x: 4400, y: 660 },
    { x: 4800, y: 800 }
];

// Left edge of the road - adjusted for thinner lanes
export const LEFT_EDGE = [
    { x: 0, y: 150 },
    { x: 800, y: 300 },
    { x: 1650, y: 250 },
    { x: 2500, y: 230 },
    { x: 3100, y: 200 },
    { x: 3800, y: 190 },
    { x: 4400, y: 450 },
    { x: 4800, y: 600 }
];

// Right edge of the road - adjusted for thinner lanes
export const RIGHT_EDGE = [
    { x: 0, y: 420 },              // Moved from 650 to 400
    { x: 800, y: 580 },
    { x: 1650, y: 550 },
    { x: 2500, y: 550 },
    { x: 3100, y: 550 },
    { x: 3800, y: 550 },
    { x: 4400, y: 770 },
    { x: 4800, y: 900 }
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
export const VEHICLE_VISIBILITY_FACTOR = 6.0; // Increased slightly to 5.5 to make vehicles fit lane width

// Passenger throughput constants
export const TICK_DURATION = 10000; // 10 seconds per tick
export const PASSENGERS_PER_CAR = 3; // 3 passengers per car
export const BUS_CAPACITY = 90; // Maximum bus capacity
export const BUS_STOP_PASSENGER_RATE = 5; // Maximum passengers per second at bus stops

// Background image path
export const BACKGROUND_IMAGE_PATH = './BRT.png';

// Vehicle behavior types
export const BEHAVIOR_TYPES = {
    POLITE: 'polite',
    NEUTRAL: 'neutral',
    AGGRESSIVE: 'aggressive'
};

// Vehicle behavior parameters
export const BEHAVIOR_PARAMS = {
    [BEHAVIOR_TYPES.POLITE]: {
        laneChangeFrequency: 0.05,
        safeDistance: 0.1,
        speedAdjustment: 0.85,
        laneChangeCooldown: 6000
    },
    [BEHAVIOR_TYPES.NEUTRAL]: {
        laneChangeFrequency: 0.3,
        safeDistance: 0.06,
        speedAdjustment: 0.95,
        laneChangeCooldown: 4000
    },
    [BEHAVIOR_TYPES.AGGRESSIVE]: {
        laneChangeFrequency: 0.6,
        safeDistance: 0.04,
        speedAdjustment: 1.1,
        laneChangeCooldown: 3000
    }
};