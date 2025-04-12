/**
 * Main entry point for the Traffic Simulation component
 */
import TrafficSimulation from './TrafficSimulation';

export default TrafficSimulation;

// You can also export other components or utilities if needed
export { default as SettingsPanel } from './SettingsPanel';

// Export utility functions that might be useful elsewhere
export {
    initializeBuses,
    updateVehiclePositions
} from './vehicleLogic';

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
} from './constants';