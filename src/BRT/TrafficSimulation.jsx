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
    initializeBuses,
    updateBuses,
} from './Logics/busLogics';
import {
    createCar,
} from './Logics/carLogics';
import {
    updateThroughput
} from './Logics/updateThroughput';
import {
    updateVehicles
} from './Logics/updateFunctions';
import { renderCanvas, renderSimulation } from './renderLogic';
import SettingsPanel from './SettingsPanel';
import ThroughputChart from './ThroughputChart';

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
    const [throughputHistory, setThroughputHistory] = useState([]);
    const throughputHistoryRef = useRef([]);
    const [totalPassengers, setTotalPassengers] = useState(0);
    const [totalBusPassengers, setTotalBusPassengers] = useState(0);
    const [totalCarPassengers, setTotalCarPassengers] = useState(0);

    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(0);
    const carSpawnerIntervalRef = useRef(null); // Track the car spawner interval
    const throughputCanvasRef = useRef(null);

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

        // Start the car spawner with current settings
        carSpawnerIntervalRef.current = setInterval(() => {
            setVehicles(prevVehicles => {
                if (!prevVehicles) return [];

                // Calculate traffic density (number of cars per lane)
                const laneDensity = {
                    1: prevVehicles.filter(v => v.lane === 1).length,
                    2: prevVehicles.filter(v => v.lane === 2).length
                };

                // Calculate maximum allowed cars per lane based on settings
                const maxCarsPerLane = Math.floor(settings.carsPerMinute / 2);

                // Calculate spawn probability based on traffic density
                const densityFactor1 = 1 - (laneDensity[1] / maxCarsPerLane);
                const densityFactor2 = 1 - (laneDensity[2] / maxCarsPerLane);

                // Only spawn new car if there's room in at least one lane
                if (densityFactor1 > 0 || densityFactor2 > 0) {
                    const newCar = createCar(settings, LANES, scaleFactor);

                    // Adjust spawn probability based on lane density
                    const spawnProbability = newCar.lane === 1 ? densityFactor1 : densityFactor2;

                    if (Math.random() < spawnProbability) {
                        return [...prevVehicles, newCar];
                    }
                }

                return prevVehicles;
            });
        }, 1000); // Check every second instead of fixed interval

        setDriverStats({ polite: 0, neutral: 0, aggressive: 0 });
        setIsSetup(true);
        setIsRunning(false);
        renderSimulation(canvasRef.current, [], newBuses);
    };

    const handleSetup = () => {
        // Reset all passenger counts and throughput data
        setTotalBusPassengers(0);
        setTotalCarPassengers(0);
        setThroughputHistory([]);
        throughputHistoryRef.current = [];

        // Reset the simulation
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

            // Count cars that have completed a full loop
            let completedCars = 0;
            updated.forEach(vehicle => {
                if (vehicle.type === 'car' && vehicle.pathPosition > 0.95) {
                    completedCars++;
                    vehicle.pathPosition = 0; // Reset position to start
                }
            });

            // Update car passenger count (3 passengers per car)
            if (completedCars > 0) {
                setTotalCarPassengers(prev => prev + (completedCars * 3));
            }

            // Update throughput data every second (1000 ticks)
            if (timestamp % 1000 < deltaTime) {
                const throughputData = updateThroughput(updated, buses);
                if (throughputData) {
                    // Update throughput history
                    setThroughputHistory(prev => {
                        const newHistory = [...prev, throughputData];
                        // Keep only the last 30 data points
                        return newHistory.slice(-30);
                    });
                    throughputHistoryRef.current = [...throughputHistoryRef.current, throughputData].slice(-30);

                    // Update passenger counts from throughput data
                    setTotalBusPassengers(prev => prev + throughputData.buses);
                    setTotalCarPassengers(prev => prev + throughputData.cars);
                }
            }

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
                    if (positionChange < 0.001) {
                        car.stuckTimer += deltaTime;
                        car.consecutiveStuckFrames++;
                    } else {
                        car.stuckTimer = 0;
                        car.consecutiveStuckFrames = 0;
                    }
                    car.lastPosition = car.pathPosition;
                }
                return car;
            });

            return updated;
        });

        // Update buses and handle their throughput
        setBuses(prevBuses => {
            const updatedBuses = updateBuses(prevBuses, vehicles, BUS_STOPS, CANVAS_WIDTH, deltaTime, LANES);

            // Count bus throughput when they exit
            updatedBuses.forEach(bus => {
                if (bus.pathPosition > 0.95 && !bus.throughputCounted) {
                    bus.throughputCounted = true;
                    const passengersExiting = bus.passengers || 0;
                    bus.throughput = passengersExiting;
                    // Add to total bus passengers count
                    setTotalBusPassengers(prev => prev + passengersExiting);
                    bus.pathPosition = 0;
                    bus.active = false;
                    // Schedule reactivation
                    setTimeout(() => {
                        bus.active = true;
                        bus.throughputCounted = false;
                        bus.passengers = Math.floor(Math.random() * 21) + 70; // Reset passengers
                    }, 10000); // 10 seconds delay
                }
            });

            return updatedBuses;
        });

        // Render the current state
        renderSimulation(
            canvasRef.current,
            vehicles,
            buses,
            BUS_STOPS,
            LANES,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            throughputHistoryRef.current
        );

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

    // Update passenger data in the visualization component
    useEffect(() => {
        if (typeof window !== 'undefined' && window.updatePassengerData) {
            window.updatePassengerData(vehicles, buses);
        }
    }, [vehicles, buses]);

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
                        <div className="text-xs mt-1">
                            Bus Passengers Delivered: <span className="font-semibold text-blue-600">{totalBusPassengers}</span>
                        </div>
                        <div className="text-xs mt-1">
                            Car Passengers Delivered: <span className="font-semibold text-green-600">{totalCarPassengers}</span>
                        </div>
                        <div className="text-xs mt-1 font-semibold">
                            Total Passengers: <span className="text-purple-600">{totalBusPassengers + totalCarPassengers}</span>
                        </div>
                    </div>
                )}
                {/* <div className="absolute top-4 right-4" style={{ marginTop: '50px' }}>
                    <ThroughputChart throughputHistory={throughputHistory} />
                </div> */}
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