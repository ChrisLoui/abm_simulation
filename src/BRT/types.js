/**
 * This file contains TypeScript-like type definitions for the simulation.
 * While the application is written in JavaScript, these definitions can be
 * helpful for documentation and understanding the data structures.
 *
 * These could be converted to actual TypeScript interfaces if the project
 * is migrated to TypeScript in the future.
 */

/**
 * Point definition for coordinates
 * @typedef {Object} Point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * Lane definition for paths that vehicles follow
 * @typedef {Object} Lane
 * @property {string} name - Name of the lane
 * @property {Point[]} points - Array of points defining the lane path
 */

/**
 * Bus stop definition
 * @typedef {Object} BusStop
 * @property {number} x - X coordinate of the bus stop center
 * @property {number} y - Y coordinate of the bus stop center
 * @property {number} radius - Radius of the bus stop circle
 */

/**
 * Base vehicle definition
 * @typedef {Object} Vehicle
 * @property {string} type - Type of vehicle ('car' or 'bus')
 * @property {number} pathPosition - Position on the path (0-1)
 * @property {number} lane - Index of the lane the vehicle is in
 * @property {string} direction - Direction of movement ('up')
 * @property {number} speed - Speed of the vehicle
 * @property {string} color - Color of the vehicle
 * @property {number} width - Width of the vehicle in pixels
 * @property {number} height - Height of the vehicle in pixels
 * @property {boolean} waiting - Whether the vehicle is waiting
 * @property {number} x - Current X coordinate
 * @property {number} y - Current Y coordinate
 * @property {number} angle - Current angle of the vehicle
 */

/**
 * Car specific properties
 * @typedef {Object} Car
 * @property {string} type - Always 'car'
 * @property {boolean} stoppedAtBusStop - Always false for cars
 */

/**
 * Bus specific properties
 * @typedef {Object} Bus
 * @property {string} type - Always 'bus'
 * @property {number} stoppedAtBusStop - Index of bus stop the bus is stopped at (-1 if not stopped)
 * @property {number} stopTime - Time remaining at the bus stop
 */

/**
 * Settings for the simulation
 * @typedef {Object} Settings
 * @property {number} carCount - Number of cars
 * @property {number} busCount - Number of buses
 * @property {number} minSpeed - Minimum speed of vehicles
 * @property {number} maxSpeed - Maximum speed of vehicles
 * @property {boolean} randomEvents - Whether random events should occur
 */

/**
 * Colors used in the simulation
 * @typedef {Object} Colors
 * @property {string} ROAD - Color of the main road
 * @property {string} BUS_LANE - Color of the bus lane
 * @property {string} LANE_DIVIDER_SOLID - Color of solid lane dividers
 * @property {string} LANE_DIVIDER_DOTTED - Color of dotted lane dividers
 * @property {string} BUS_STOP_RING - Color of the bus stop ring
 * @property {string} BUS_STOP_CENTER - Color of the bus stop center
 * @property {string} BUS_COLOR - Color of buses
 * @property {string} HEADLIGHTS - Color of headlights
 * @property {string} BRAKE_LIGHTS - Color of brake lights
 * @property {string} WINDOWS - Color of windows
 * @property {string} STOP_INDICATOR - Color of stop indicator
 * @property {string} STOP_TEXT - Color of stop text
 */