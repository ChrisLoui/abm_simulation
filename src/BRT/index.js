/**
 * Main entry point for the Traffic Simulation component
 */
import TrafficSimulation from './TrafficSimulation';

export default TrafficSimulation;

// You can also export other components or utilities if needed

// Export utility functions that might be useful elsewhere
export {
    initializeBuses,
    updateBuses,
} from './Logics/busLogics';
export {
    createCar,
} from './Logics/carLogics';
export {
    updateThroughput
} from './Logics/updateThroughput';
export {
    updateVehicles
} from './Logics/updateFunctions';

export {
    renderCanvas,
    renderSimulation
} from './renderLogic';

// Export constants that might be useful elsewhere
export {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    ROAD_LENGTH_METERS,
    COLORS,
    CAR_COLORS
} from './scenarioConstants';