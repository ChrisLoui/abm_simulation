import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Settings, RefreshCw } from 'lucide-react';
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    ROAD_LENGTH_METERS,
    BUS_STOPS,
    LANES
} from './constants';
import {
    createCar,
    initializeBuses,
    updateVehicles,
    updateBuses
} from './vehicleLogic';
import { renderCanvas, renderSimulation } from './renderLogic';
import SettingsPanel from './SettingsPanel';

const TrafficSimulation = () => {
    // New setting: carsPerMinute determines how many cars spawn per minute.
    const [settings, setSettings] = useState({
        carsPerMinute: 100, // e.g., 100 cars per minute
        busCount: 5,
        minSpeed: 1,
        maxSpeed: 3,
        randomEvents: true
    });
    const [isRunning, setIsRunning] = useState(false);
    const [isSetup, setIsSetup] = useState(false);
    // Start with an empty array because cars will spawn dynamically.
    const [vehicles, setVehicles] = useState([]);
    const [buses, setBuses] = useState([]);
    const [driverStats, setDriverStats] = useState({
        polite: 0,
        neutral: 0,
        aggressive: 0
    });
    const [activeBusCount, setActiveBusCount] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [trafficDensity, setTrafficDensity] = useState(0);

    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(0);
    const carSpawnerIntervalRef = useRef(null); // Track the car spawner interval

    // Calculate scale factor (pixels per meter).
    const scaleFactor = CANVAS_WIDTH / ROAD_LENGTH_METERS;

    // Draw the initial empty road.
    useEffect(() => {
        renderCanvas(canvasRef.current);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (carSpawnerIntervalRef.current) {
                clearInterval(carSpawnerIntervalRef.current);
            }
        };
    }, []);

    // Set up the animation loop.
    useEffect(() => {
        if (isRunning) {
            lastTimeRef.current = performance.now();
            animationRef.current = requestAnimationFrame(animate);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isRunning, vehicles, buses]);

    // Update the active bus count and driver stats
    useEffect(() => {
        if (buses.length > 0) {
            const count = buses.filter(bus => bus.active).length;
            setActiveBusCount(count);
        }

        if (vehicles.length > 0) {
            const stats = {
                polite: 0,
                neutral: 0,
                aggressive: 0
            };

            vehicles.forEach(vehicle => {
                if (vehicle.behaviorType) {
                    stats[vehicle.behaviorType]++;
                }
            });

            setDriverStats(stats);

            // Calculate traffic density
            // Simple metric: percentage of road filled by cars
            // More sophisticated metrics could consider distribution
            const density = Math.min(vehicles.length / 100, 1) * 100;
            setTrafficDensity(Math.round(density));
        } else {
            setTrafficDensity(0);
        }
    }, [vehicles, buses]);

    const spawnInterval = 60000 / settings.carsPerMinute;
    // Initialization function for simulation elements.
    const initializeTrafficElements = () => {
        // Clear any previous car spawner interval
        if (carSpawnerIntervalRef.current) {
            clearInterval(carSpawnerIntervalRef.current);
            carSpawnerIntervalRef.current = null;
        }

        // Initialize buses (only one active at start; others schedule in later).
        const newBuses = initializeBuses(settings, LANES, scaleFactor);
        setBuses(newBuses);

        // Start with an empty vehicles array for dynamic car spawner.
        setVehicles([]);

        // Calculate spawn interval based on current settings
        const spawnInterval = 60000 / settings.carsPerMinute;

        // Start the car spawner with current settings
        carSpawnerIntervalRef.current = setInterval(() => {
            const newCar = createCar(settings, LANES, scaleFactor);

            setVehicles(prevVehicles => {
                // Check if prevVehicles is defined before using .length
                if (!prevVehicles) return [newCar];

                // Limit maximum vehicles to prevent performance issues
                const maxVehicles = 200;

                // Calculate current density
                const currentDensity = prevVehicles.length / maxVehicles;

                // Skip spawning sometimes when density is high
                if (currentDensity > 0.7 && Math.random() < currentDensity - 0.5) {
                    return prevVehicles; // Skip this spawn
                }

                const updatedVehicles = [...prevVehicles, newCar];

                // If over max, prioritize keeping newer vehicles
                if (updatedVehicles.length > maxVehicles) {
                    return updatedVehicles.slice(updatedVehicles.length - maxVehicles);
                }

                return updatedVehicles;
            });
        }, spawnInterval);

        setDriverStats({ polite: 0, neutral: 0, aggressive: 0 });
        setIsSetup(true);
        setIsRunning(false);
        renderSimulation(canvasRef.current, [], newBuses);
    };

    const handleSetup = () => {
        initializeTrafficElements();
    };

    const toggleSimulation = () => {
        if (!isSetup) {
            handleSetup();
        }
        setIsRunning(prev => !prev);
    };

    const animate = (timestamp) => {
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Update cars with improved movement and stuck detection
        setVehicles(prevVehicles => {
            // First update all vehicles
            let updated = updateVehicles(prevVehicles, buses, deltaTime, LANES);

            // Monitor for stuck cars but don't remove them
            updated = updated.map(car => {
                if (car.type === 'car') {
                    // Initialize stuck properties if they don't exist
                    if (car.stuckTimer === undefined) {
                        car.stuckTimer = 0;
                        car.lastPosition = car.pathPosition;
                        car.consecutiveStuckFrames = 0;
                    }

                    // Check if the car has moved
                    const positionChange = Math.abs(car.pathPosition - (car.lastPosition || 0));
                    car.lastPosition = car.pathPosition;

                    if (positionChange < 0.0001 && !car.waiting) {
                        car.stuckTimer += deltaTime;
                        car.consecutiveStuckFrames++;
                    } else {
                        // Reset stuck timer if car moved significantly
                        car.stuckTimer = Math.max(0, car.stuckTimer - (deltaTime * 0.5));
                        car.consecutiveStuckFrames = 0;
                    }
                }
                return car;
            }).filter(car => {
                // Only remove vehicles that have completed the circuit or gone off-screen
                const offScreen = car.x < -100 || car.x > CANVAS_WIDTH + 100 ||
                    car.y < -100 || car.y > CANVAS_HEIGHT + 100;

                // If a car completed a full loop, let it exit
                const completedLoop = car.pathPosition > 0.98;

                return !offScreen && !completedLoop;
            });

            return updated;
        });

        // Update buses
        setBuses(prevBuses =>
            updateBuses(prevBuses, vehicles, BUS_STOPS, CANVAS_WIDTH, deltaTime, LANES)
        );

        renderSimulation(canvasRef.current, vehicles, buses);
        animationRef.current = requestAnimationFrame(animate);
    };

    const toggleSettings = () => {
        setShowSettings(prev => !prev);
    };

    const handleSettingChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings({
            ...settings,
            [name]: type === 'checkbox' ? checked : Number(value)
        });
    };

    // In applySettings, properly clean up and re-initialize
    const applySettings = () => {
        // Reset simulation with new settings
        setIsSetup(false);
        setIsRunning(false);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        if (carSpawnerIntervalRef.current) {
            clearInterval(carSpawnerIntervalRef.current);
        }

        renderCanvas(canvasRef.current);
        setShowSettings(false);

        // Re-initialize with new settings
        initializeTrafficElements();
    };

    // In the cleanup useEffect
    useEffect(() => {
        renderCanvas(canvasRef.current);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (carSpawnerIntervalRef.current) {
                clearInterval(carSpawnerIntervalRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">
                Scenario 1 - Road with Bus Lane (2.6km)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
                Scheduled Bus Service: One bus every 30 simulation minutes (30 seconds here).
            </p>
            <div className="relative mb-4">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border border-gray-300 bg-white rounded shadow-md"
                />
                <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                        onClick={handleSetup}
                        className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
                        title="Setup Simulation"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={toggleSimulation}
                        className={`${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white p-2 rounded transition-colors`}
                        title={isRunning ? "Pause Simulation" : "Start Simulation"}
                    >
                        {isRunning ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button
                        onClick={toggleSettings}
                        className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
                {showSettings && (
                    <SettingsPanel
                        settings={settings}
                        handleSettingChange={handleSettingChange}
                        applySettings={applySettings}
                    />
                )}
                {isSetup && (
                    <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-lg border border-gray-300">
                        <div className="text-xs font-semibold mb-1">Simulation Stats:</div>
                        <div className="text-xs text-blue-600 mb-1">
                            Active Buses: <span className="font-semibold">{activeBusCount}/{settings.busCount}</span>
                        </div>
                        <div className="text-xs">
                            Polite Drivers: <span className="font-semibold text-blue-600">{driverStats.polite}</span>
                        </div>
                        <div className="text-xs">
                            Neutral Drivers: <span className="font-semibold text-green-600">{driverStats.neutral}</span>
                        </div>
                        <div className="text-xs">
                            Aggressive Drivers: <span className="font-semibold text-red-600">{driverStats.aggressive}</span>
                        </div>
                        <div className="text-xs mt-1">
                            Total Vehicles: <span className="font-semibold">{vehicles.length}</span>
                        </div>
                        <div className="text-xs mt-1">
                            Traffic Density:
                            <span className={`font-semibold ml-1 ${trafficDensity > 75 ? 'text-red-600' :
                                    trafficDensity > 50 ? 'text-yellow-600' :
                                        'text-green-600'
                                }`}>
                                {trafficDensity}%
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="text-sm text-gray-600 max-w-md">
                <p className="mb-2">
                    This simulation recreates Scenario 1 from the reference image, showing cars and buses navigating a road with a dedicated bus lane.
                </p>
                <p className="mb-2">
                    <strong>Instructions:</strong> Click the setup button <RefreshCw size={16} className="inline" /> to initialize the simulation with current settings. Then click the play button <Play size={16} className="inline" /> to start the simulation.
                </p>
                <p className="mb-2">
                    Buses (blue) follow a schedule with one bus every 30 simulation minutes (30 seconds here). Each bus stops briefly at bus stops.
                </p>
                <p className="mb-2">
                    Cars now spawn dynamically at a rate of <strong>{settings.carsPerMinute} cars per minute</strong> from the left side.
                </p>
                <p>
                    Car behavior types vary: polite (rarely change lanes), neutral (change when necessary), and aggressive (change frequently).
                </p>
            </div>
        </div>
    );
};

export default TrafficSimulation;