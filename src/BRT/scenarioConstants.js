// Canvas dimensions - landscape orientation with longer road
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 800;

// Road length in meters (2.6km = 2600m)
export const ROAD_LENGTH_METERS = 2600;

// Common colors for both scenarios
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
export const VEHICLE_VISIBILITY_FACTOR = 5.5;

// Scenario 1: Road with dedicated bus lane
export const SCENARIO_1 = {
    BUS_STOPS: [
        { x: 750, y: 150, radius: 40, peopleWaiting: Math.floor(Math.random() * 11) },
        { x: 1750, y: 150, radius: 40, peopleWaiting: Math.floor(Math.random() * 11) },
        { x: 2800, y: 140, radius: 40, peopleWaiting: Math.floor(Math.random() * 11) },
        { x: 3900, y: 120, radius: 40, peopleWaiting: Math.floor(Math.random() * 11) }
    ],
    LANES: [
        {
            name: 'busLane', points: [
                { x: 20, y: 180 },
                { x: 800, y: 150 },
                { x: 1650, y: 150 },
                { x: 2500, y: 150 },
                { x: 3100, y: 140 },
                { x: 3800, y: 120 },
                { x: 4400, y: 90 },
                { x: 4800, y: 70 }
            ]
        },
        {
            name: 'regularLane1', points: [
                { x: 20, y: 280 },
                { x: 800, y: 250 },
                { x: 1650, y: 270 },
                { x: 2500, y: 270 },
                { x: 3100, y: 250 },
                { x: 3800, y: 230 },
                { x: 4400, y: 210 },
                { x: 4800, y: 190 }
            ]
        },
        {
            name: 'regularLane2', points: [
                { x: 20, y: 350 },
                { x: 800, y: 350 },
                { x: 1650, y: 350 },
                { x: 2500, y: 350 },
                { x: 3100, y: 340 },
                { x: 3800, y: 320 },
                { x: 4400, y: 290 },
                { x: 4800, y: 270 }
            ]
        }
    ],
    ROAD_MAIN_PATH: [
        { x: 0, y: 200 },
        { x: 0, y: 400 },
        { x: 800, y: 380 },
        { x: 1650, y: 400 },
        { x: 2500, y: 400 },
        { x: 3100, y: 390 },
        { x: 3800, y: 370 },
        { x: 4400, y: 340 },
        { x: 4800, y: 320 },
        { x: 4800, y: 70 },
        { x: 4400, y: 90 },
        { x: 3800, y: 120 },
        { x: 3100, y: 140 },
        { x: 2500, y: 150 },
        { x: 1650, y: 150 },
        { x: 800, y: 150 },
        { x: 0, y: 200 }
    ],
    BUS_LANE_PATH: [
        { x: 0, y: 250 },
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
    ],
    FIRST_LANE_DIVIDER: [
        { x: 0, y: 250 },
        { x: 800, y: 210 },
        { x: 1650, y: 230 },
        { x: 2500, y: 230 },
        { x: 3100, y: 220 },
        { x: 3800, y: 200 },
        { x: 4400, y: 170 },
        { x: 4800, y: 150 }
    ],
    SECOND_LANE_DIVIDER: [
        { x: 0, y: 320 },
        { x: 800, y: 290 },
        { x: 1650, y: 310 },
        { x: 2500, y: 320 },
        { x: 3100, y: 310 },
        { x: 3800, y: 290 },
        { x: 4400, y: 260 },
        { x: 4800, y: 230 }
    ],
    LEFT_EDGE: [
        { x: 0, y: 150 },
        { x: 800, y: 100 },
        { x: 1650, y: 100 },
        { x: 2500, y: 100 },
        { x: 3100, y: 90 },
        { x: 3800, y: 70 },
        { x: 4400, y: 40 },
        { x: 4800, y: 10 }
    ],
    RIGHT_EDGE: [
        { x: 0, y: 400 },
        { x: 800, y: 380 },
        { x: 1650, y: 400 },
        { x: 2500, y: 400 },
        { x: 3100, y: 390 },
        { x: 3800, y: 370 },
        { x: 4400, y: 340 },
        { x: 4800, y: 320 }
    ],
    busLaneRestrictions: true // In Scenario 1, only buses can use lane 0
};

// Scenario 2: Road with three shared lanes (no bus lane, no stations)
export const SCENARIO_2 = {
    // No bus stops in Scenario 2
    BUS_STOPS: [],
    LANES: [
        {
            name: 'sharedLane1', points: [
                { x: 20, y: 180 },
                { x: 800, y: 150 },
                { x: 1650, y: 150 },
                { x: 2500, y: 150 },
                { x: 3100, y: 140 },
                { x: 3800, y: 120 },
                { x: 4400, y: 90 },
                { x: 4800, y: 70 }
            ]
        },
        {
            name: 'sharedLane2', points: [
                { x: 20, y: 280 },
                { x: 800, y: 250 },
                { x: 1650, y: 270 },
                { x: 2500, y: 270 },
                { x: 3100, y: 250 },
                { x: 3800, y: 230 },
                { x: 4400, y: 210 },
                { x: 4800, y: 190 }
            ]
        },
        {
            name: 'sharedLane3', points: [
                { x: 20, y: 350 },
                { x: 800, y: 350 },
                { x: 1650, y: 350 },
                { x: 2500, y: 350 },
                { x: 3100, y: 340 },
                { x: 3800, y: 320 },
                { x: 4400, y: 290 },
                { x: 4800, y: 270 }
            ]
        }
    ],
    // Uniform road for all lanes - no visual separation for bus lane
    ROAD_MAIN_PATH: [
        { x: 0, y: 130 },
        { x: 0, y: 400 },
        { x: 800, y: 380 },
        { x: 1650, y: 400 },
        { x: 2500, y: 400 },
        { x: 3100, y: 390 },
        { x: 3800, y: 370 },
        { x: 4400, y: 340 },
        { x: 4800, y: 320 },
        { x: 4800, y: 70 },
        { x: 4400, y: 90 },
        { x: 3800, y: 120 },
        { x: 3100, y: 140 },
        { x: 2500, y: 150 },
        { x: 1650, y: 150 },
        { x: 800, y: 150 },
        { x: 0, y: 130 }
    ],
    // No specialized bus lane in Scenario 2
    BUS_LANE_PATH: null,
    FIRST_LANE_DIVIDER: [
        { x: 0, y: 220 },  // First lane divider between shared lanes 1 and 2
        { x: 800, y: 210 },
        { x: 1650, y: 230 },
        { x: 2500, y: 230 },
        { x: 3100, y: 220 },
        { x: 3800, y: 200 },
        { x: 4400, y: 170 },
        { x: 4800, y: 150 }
    ],
    SECOND_LANE_DIVIDER: [
        { x: 0, y: 320 },  // Second lane divider between shared lanes 2 and 3
        { x: 800, y: 290 },
        { x: 1650, y: 310 },
        { x: 2500, y: 320 },
        { x: 3100, y: 310 },
        { x: 3800, y: 290 },
        { x: 4400, y: 260 },
        { x: 4800, y: 230 }
    ],
    LEFT_EDGE: [
        { x: 0, y: 130 },
        { x: 800, y: 100 },
        { x: 1650, y: 100 },
        { x: 2500, y: 100 },
        { x: 3100, y: 90 },
        { x: 3800, y: 70 },
        { x: 4400, y: 40 },
        { x: 4800, y: 10 }
    ],
    RIGHT_EDGE: [
        { x: 0, y: 400 },
        { x: 800, y: 380 },
        { x: 1650, y: 400 },
        { x: 2500, y: 400 },
        { x: 3100, y: 390 },
        { x: 3800, y: 370 },
        { x: 4400, y: 340 },
        { x: 4800, y: 320 }
    ],
    busLaneRestrictions: false // In Scenario 2, buses can use any lane
};

// Function to get scenario constants based on selection
export const getScenarioConstants = (scenario) => {
    return scenario === '2' ? SCENARIO_2 : SCENARIO_1;
};