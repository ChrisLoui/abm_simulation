# Traffic Simulation - Bus Rapid Transit System

This project is an agent-based traffic simulation that models a 2.6km road system with multiple lanes, including a dedicated bus lane. The simulation visualizes cars and buses moving along the road with realistic behavior, including collision avoidance, lane changes, and scheduled bus stops.

![Traffic Simulation Screenshot](https://via.placeholder.com/800x400?text=Traffic+Simulation)

## Features

- **Multiple Lane System**: Includes a dedicated bus lane and regular traffic lanes
- **Realistic Vehicle Behavior**:
  - Collision avoidance and vehicle following behavior
  - Lane changing for regular vehicles based on driver personality
  - Buses stop at designated bus stops
- **Driver Personalities**: Cars have distinct behavior types (polite, neutral, aggressive)
- **Real-time Visualization**: Canvas-based rendering with detailed vehicle graphics
- **Configurable Settings**: Adjust vehicle counts, speeds, and other parameters
- **Scheduled Bus Service**: Buses enter the simulation at regular intervals

## Bus Behavior
Buses in this simulation follow these rules:
- Travel only in the dedicated bus lane
- Stop at designated bus stops along the route
- Wait briefly at each stop (0-300ms) before continuing
- Stop when obstacles are detected ahead
- Automatically continue when the path ahead is clear
- Visual indicators show when a bus is stopped at a station or waiting due to traffic

## How to Run

### Prerequisites
- Node.js (v14 or later)
- npm

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/abm_simulation.git
cd abm_simulation
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click the **Setup** button to initialize the simulation with the current settings. This prepares the simulation environment but does not start any movement or vehicle generation.
2. Click the **Play** button to begin the simulation. Only at this point will cars start to be generated and movement begin.
3. Click the **Pause** button to temporarily stop the simulation while preserving its current state.
4. Use the **Settings** button to adjust parameters like car spawn rate, bus count, and speed ranges.

The simulation is designed to minimize resource usage - no background processing or vehicle generation occurs until you explicitly click the Play button.

## Project Structure

- `/src/BRT/` - Main simulation code
  - `TrafficSimulation.jsx` - Core simulation component
  - `vehicleLogic.js` - Logic for vehicle movement and behavior
  - `renderLogic.js` - Canvas rendering and visualization
  - `constants.js` - Simulation parameters and settings
  - `SettingsPanel.jsx` - UI for adjusting simulation parameters

## Simulation Details

- Road length: 2.6km (2600 meters)
- Canvas dimensions: 5000×800 pixels
- Scheduled bus service: One bus every 30 minutes (simulation time)
- Vehicle scale: Proportional to real-world dimensions
  - Cars: 4.5m × 2.5m
  - Buses: 12m × 2.5m

## Future Enhancements

- Traffic light systems
- Pedestrian interactions
- Additional vehicle types
- Multiple road configurations
- Data collection and analytics dashboard

## License

[MIT](LICENSE)

## Acknowledgements

- React.js for UI components
- HTML5 Canvas for rendering
- Create React App for project bootstrapping
