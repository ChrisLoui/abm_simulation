import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Settings, RefreshCw, ChevronLeft, ChevronRight, BarChart3, Clock } from 'lucide-react';
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
import PlotlyChart from './ThroughputChart';
import TravelTimeChart from './TravelTimeChart';

const TrafficSimulation = () => {
    // Simplified settings with three key parameters
    const [settings, setSettings] = useState({
        trafficDensity: 'Medium', // Low, Medium, High
        scenario: 'Without Bus Lane', // With Bus Lane, Without Bus Lane
        busSchedule: '20mins' // 10mins, 20mins, 30mins
    });

    const [isRunning, setIsRunning] = useState(false);
    const [isSetup, setIsSetup] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [buses, setBuses] = useState([]);
    const [driverStats, setDriverStats] = useState({
        polite: 0,
        neutral: 0,
        aggressive: 0
    });
    const [activeBusCount, setActiveBusCount] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [showCharts, setShowCharts] = useState(false);
    const [trafficDensity, setTrafficDensity] = useState(0);
    const [throughputHistory, setThroughputHistory] = useState([]);
    const throughputHistoryRef = useRef([]);
    const [totalBusPassengers, setTotalBusPassengers] = useState(0);
    const [totalCarPassengers, setTotalCarPassengers] = useState(0);
    const [totalPassengersAlighted, setTotalPassengersAlighted] = useState(0);

    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(0);
    const carSpawnerIntervalRef = useRef(null);
    const throughputCanvasRef = useRef(null);

    // Calculate scale factor (pixels per meter).
    const scaleFactor = CANVAS_WIDTH / ROAD_LENGTH_METERS;

    // Add new state for travel times
    const [busTravelTimes, setBusTravelTimes] = useState([]);
    const [carTravelTimes, setCarTravelTimes] = useState([]);

    // Add new state for chart reset
    const [shouldResetCharts, setShouldResetCharts] = useState(false);

    // Convert simplified settings to simulation parameters
    const getSimulationParams = () => {
        // Traffic Density mapping
        const densityMap = {
            'Low': { carsPerMinute: 60, maxSpeed: 4, minSpeed: 2 },
            'Medium': { carsPerMinute: 120, maxSpeed: 3, minSpeed: 1.5 },
            'High': { carsPerMinute: 180, maxSpeed: 2, minSpeed: 1 }
        };

        // Bus Schedule mapping (converted to milliseconds for intervals)
        const scheduleMap = {
            '10mins': 10000, // 10 seconds in simulation time
            '20mins': 20000, // 20 seconds in simulation time
            '30mins': 30000  // 30 seconds in simulation time
        };

        // Bus count based on schedule (more frequent = more buses needed)
        const busCountMap = {
            '10mins': 6,
            '20mins': 4,
            '30mins': 3
        };

        return {
            ...densityMap[settings.trafficDensity],
            busCount: busCountMap[settings.busSchedule],
            busInterval: scheduleMap[settings.busSchedule],
            hasBusLane: settings.scenario === 'With Bus Lane',
            randomEvents: true,
            busSchedule: settings.busSchedule
        };
    };

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
            const density = Math.min(vehicles.length / 100, 1) * 100;
            setTrafficDensity(Math.round(density));
        } else {
            setTrafficDensity(0);
        }
    }, [vehicles, buses]);

    // Initialization function for simulation elements.
    const initializeTrafficElements = () => {
        const params = getSimulationParams();

        // Clear any previous car spawner interval
        if (carSpawnerIntervalRef.current) {
            clearInterval(carSpawnerIntervalRef.current);
            carSpawnerIntervalRef.current = null;
        }

        // Initialize buses with new parameters
        const newBuses = initializeBuses(params, LANES, scaleFactor);
        setBuses(newBuses);

        // Start with an empty vehicles array for dynamic car spawner.
        setVehicles([]);

        // Start the car spawner with current settings
        const spawnInterval = 60000 / params.carsPerMinute; // Convert cars per minute to interval
        carSpawnerIntervalRef.current = setInterval(() => {
            setVehicles(prevVehicles => {
                if (!prevVehicles) return [];

                // Calculate traffic density (number of cars per lane)
                const laneDensity = {
                    1: prevVehicles.filter(v => v.lane === 1).length,
                    2: prevVehicles.filter(v => v.lane === 2).length
                };

                // Calculate maximum allowed cars per lane based on settings
                const maxCarsPerLane = Math.floor(params.carsPerMinute / 2);

                // Calculate spawn probability based on traffic density
                const densityFactor1 = 1 - (laneDensity[1] / maxCarsPerLane);
                const densityFactor2 = 1 - (laneDensity[2] / maxCarsPerLane);

                // Only spawn new car if there's room in at least one lane
                if (densityFactor1 > 0 || densityFactor2 > 0) {
                    const newCar = createCar(params, LANES, scaleFactor);

                    // Adjust spawn probability based on lane density
                    const spawnProbability = newCar.lane === 1 ? densityFactor1 : densityFactor2;

                    if (Math.random() < spawnProbability) {
                        return [...prevVehicles, newCar];
                    }
                }

                return prevVehicles;
            });
        }, spawnInterval);

        setDriverStats({ polite: 0, neutral: 0, aggressive: 0 });
        setIsSetup(true);
        setIsRunning(false);
        renderSimulation(canvasRef.current, [], newBuses);
    };

    const handleSetup = () => {
        // Stop any ongoing simulation
        setIsRunning(false);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        if (carSpawnerIntervalRef.current) {
            clearInterval(carSpawnerIntervalRef.current);
            carSpawnerIntervalRef.current = null;
        }

        // Trigger chart resets
        setShouldResetCharts(true);

        // Reset all state variables
        setVehicles([]);
        setBuses([]);
        setTotalBusPassengers(0);
        setTotalCarPassengers(0);
        setTotalPassengersAlighted(0);
        setBusTravelTimes([]);
        setCarTravelTimes([]);
        setDriverStats({
            polite: 0,
            neutral: 0,
            aggressive: 0
        });
        setActiveBusCount(0);
        setTrafficDensity(0);
        setThroughputHistory([]);
        throughputHistoryRef.current = [];

        // Reset bus stops
        BUS_STOPS.forEach(stop => {
            stop.waitingPassengers = 0;
            stop.lastUpdateTime = null;
        });

        // Clear the canvas and redraw the empty road
        renderCanvas(canvasRef.current);

        // Hide settings panel and mark setup as complete
        setShowSettings(false);
        setIsSetup(true);

        // Reset the charts reset trigger after a short delay
        setTimeout(() => {
            setShouldResetCharts(false);
        }, 100);
    };

    const startSimulation = () => {
        if (!isSetup) {
            handleSetup();
        }

        // Initialize buses based on current settings
        const params = getSimulationParams();
        const newBuses = initializeBuses(params, LANES, scaleFactor);
        setBuses(newBuses);

        // Start the car spawner with current settings
        const spawnInterval = 60000 / params.carsPerMinute; // Convert cars per minute to interval
        carSpawnerIntervalRef.current = setInterval(() => {
            setVehicles(prevVehicles => {
                if (!prevVehicles) return [];

                // Calculate traffic density
                const laneDensity = {
                    1: prevVehicles.filter(v => v.lane === 1).length,
                    2: prevVehicles.filter(v => v.lane === 2).length
                };

                // Calculate maximum allowed cars per lane
                const maxCarsPerLane = Math.floor(params.carsPerMinute / 2);

                // Calculate spawn probability based on traffic density
                const densityFactor1 = 1 - (laneDensity[1] / maxCarsPerLane);
                const densityFactor2 = 1 - (laneDensity[2] / maxCarsPerLane);

                // Only spawn new car if there's room in at least one lane
                if (densityFactor1 > 0 || densityFactor2 > 0) {
                    const newCar = createCar(params, LANES, scaleFactor);

                    // Adjust spawn probability based on lane density
                    const spawnProbability = newCar.lane === 1 ? densityFactor1 : densityFactor2;

                    if (Math.random() < spawnProbability) {
                        return [...prevVehicles, newCar];
                    }
                }

                return prevVehicles;
            });
        }, spawnInterval);

        // Start the animation loop
        setIsRunning(true);
        lastTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(animate);
    };

    // Modify the toggleSimulation function to use startSimulation
    const toggleSimulation = () => {
        if (!isRunning) {
            startSimulation();
        } else {
            setIsRunning(false);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    };

    const animate = (timestamp) => {
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Update cars with improved movement and stuck detection
        setVehicles(prevVehicles => {
            // First update all vehicles
            let updated = updateVehicles(prevVehicles, buses, deltaTime, LANES);

            // Track completed trips and travel times
            updated.forEach(vehicle => {
                if (vehicle.type === 'car' && vehicle.pathPosition > 0.95) {
                    // Calculate travel time for completed trip
                    const travelTime = (timestamp - vehicle.startTime) / 1000; // Convert to seconds
                    setCarTravelTimes(prev => [...prev, travelTime]);

                    // Reset position and start time for next trip
                    vehicle.pathPosition = 0;
                    vehicle.startTime = timestamp;

                    // Update passenger count (3 passengers per car)
                    setTotalCarPassengers(prev => prev + (Math.floor(Math.random() * 3) + 1));
                } else if (vehicle.type === 'car' && !vehicle.startTime) {
                    // Initialize start time for new cars
                    vehicle.startTime = timestamp;
                }
            });

            return updated;
        });

        // Update buses and handle their throughput
        setBuses(prevBuses => {
            const updatedBuses = updateBuses(
                prevBuses, vehicles,
                BUS_STOPS,
                CANVAS_WIDTH,
                deltaTime,
                LANES,
                (passengersAlighted) => {
                    //Runs every time passengers get off a bus
                    setTotalPassengersAlighted(prev => prev + passengersAlighted);
                }
            );

            // Track bus travel times and throughput
            updatedBuses.forEach(bus => {
                if (bus.pathPosition > 0.95 && !bus.throughputCounted) {
                    // Calculate travel time for completed trip
                    const travelTime = (timestamp - (bus.startTime || timestamp)) / 1000; // Convert to seconds
                    setBusTravelTimes(prev => [...prev, travelTime]);

                    bus.throughputCounted = true;
                    const passengersExiting = bus.passengers || 0;
                    bus.throughput = passengersExiting;
                    setTotalBusPassengers(prev => prev + passengersExiting);

                    // Reset for next trip
                    bus.pathPosition = 0;
                    bus.active = false;
                    bus.startTime = timestamp;

                    // Schedule reactivation
                    const params = getSimulationParams();
                    setTimeout(() => {
                        bus.active = true;
                        bus.throughputCounted = false;
                        bus.passengers = Math.floor(Math.random() * 21) + 70; // Reset passengers
                    }, params.busInterval);
                } else if (bus.active && !bus.startTime) {
                    // Initialize start time for new/reactivated buses
                    bus.startTime = timestamp;
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

    const handleSettingChange = (settingName, value) => {
        setSettings(prev => ({
            ...prev,
            [settingName]: value
        }));
    };

    const currentParams = getSimulationParams();

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            {/* Top Control Bar */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '80px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 32px',
                zIndex: 20,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Left: Title and Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#1a202c',
                        margin: 0
                    }}>
                        BRT Traffic Simulation
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {!isSetup && (
                            <div style={{
                                padding: '6px 16px',
                                background: 'linear-gradient(135deg, #e2e8f0, #cbd5e0)',
                                color: '#4a5568',
                                borderRadius: '25px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                Ready to Configure
                            </div>
                        )}
                        {isSetup && !isRunning && (
                            <div style={{
                                padding: '6px 16px',
                                background: 'linear-gradient(135deg, #fed7aa, #fdba74)',
                                color: '#c2410c',
                                borderRadius: '25px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                Paused
                            </div>
                        )}
                        {isSetup && isRunning && (
                            <div style={{
                                padding: '6px 16px',
                                background: 'linear-gradient(135deg, #6ee7b7, #34d399)',
                                color: '#065f46',
                                borderRadius: '25px',
                                fontSize: '14px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    animation: 'pulse 2s infinite'
                                }}></div>
                                Running
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                            <span style={{
                                padding: '4px 12px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#2563eb',
                                borderRadius: '15px',
                                fontWeight: '500'
                            }}>
                                {settings.scenario}
                            </span>
                            <span style={{
                                padding: '4px 12px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#059669',
                                borderRadius: '15px',
                                fontWeight: '500'
                            }}>
                                {settings.trafficDensity} Traffic
                            </span>
                            <span style={{
                                padding: '4px 12px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: '#7c3aed',
                                borderRadius: '15px',
                                fontWeight: '500'
                            }}>
                                Every {settings.busSchedule}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Control Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            background: showSettings ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                            color: showSettings ? 'white' : '#4b5563',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        <Settings size={18} />
                        Settings
                    </button>

                    <button
                        onClick={handleSetup}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <RefreshCw size={18} />
                        Setup
                    </button>

                    <button
                        onClick={toggleSimulation}
                        style={{
                            background: isRunning ?
                                'linear-gradient(135deg, #ef4444, #dc2626)' :
                                'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            boxShadow: isRunning ?
                                '0 4px 12px rgba(239, 68, 68, 0.3)' :
                                '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        {isRunning ? <Pause size={20} /> : <Play size={20} />}
                        {isRunning ? 'Pause' : 'Start'}
                    </button>
                </div>
            </div>

            {/* Main Simulation Canvas - Full Screen */}
            <div style={{
                position: 'absolute',
                top: '80px',
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
            }}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    style={{
                        maxWidth: '95%',
                        maxHeight: '95%',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '3px solid rgba(255, 255, 255, 0.3)'
                    }}
                />
            </div>

            {/* Live Stats - Top Right Overlay */}
            {isSetup && (
                <div style={{
                    position: 'absolute',
                    top: '100px',
                    right: '24px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '20px',
                    minWidth: '320px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    zIndex: 15
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: '0 0 16px 0'
                    }}>
                        Live Statistics
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📈 <strong>Total Passengers Alighted</strong>
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>
                                {totalPassengersAlighted}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🚌 <strong>Bus Passengers</strong>
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                                {totalBusPassengers+totalPassengersAlighted}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🚗 <strong>Car Passengers</strong>
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                                {totalCarPassengers}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🚶‍♂️ <strong>Total Passengers</strong>
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c2d12' }}>
                                {totalBusPassengers + totalCarPassengers}
                            </span>
                        </div>
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ⚡ <strong>Grand Total</strong>
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c2d12' }}>
                                    {totalBusPassengers + totalCarPassengers + totalPassengersAlighted}
                                </span>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🚌⏱️ <strong>Avg Bus Travel Time</strong>
                                </span>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>
                                    {busTravelTimes.length > 0 ?
                                        `${(busTravelTimes.reduce((a, b) => a + b, 0) / busTravelTimes.length).toFixed(1)}s` :
                                        'N/A'}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🚗⏱️ <strong>Avg Car Travel Time</strong>
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>
                                {carTravelTimes.length > 0 ?
                                    `${(carTravelTimes.reduce((a, b) => a + b, 0) / carTravelTimes.length).toFixed(1)}s` :
                                    'N/A'}
                            </span>
                        </div>

                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ⚡ <strong>Speed Advantage</strong>
                                </span>
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: busTravelTimes.length > 0 && carTravelTimes.length > 0 ?
                                        ((busTravelTimes.reduce((a, b) => a + b, 0) / busTravelTimes.length) <
                                            (carTravelTimes.reduce((a, b) => a + b, 0) / carTravelTimes.length) ? '#059669' : '#dc2626') : '#6b7280'
                                }}>
                                    {busTravelTimes.length > 0 && carTravelTimes.length > 0 ?
                                        ((busTravelTimes.reduce((a, b) => a + b, 0) / busTravelTimes.length) <
                                            (carTravelTimes.reduce((a, b) => a + b, 0) / carTravelTimes.length) ? 'Buses Faster' : 'Cars Faster') :
                                        'Calculating...'}
                                </span>
                            </div>
                            {busTravelTimes.length > 0 && carTravelTimes.length > 0 && (
                                <div style={{
                                    fontSize: '12px',
                                    color: '#9ca3af',
                                    textAlign: 'center',
                                    marginTop: '4px'
                                }}>
                                    {Math.abs(
                                        (busTravelTimes.reduce((a, b) => a + b, 0) / busTravelTimes.length) -
                                        (carTravelTimes.reduce((a, b) => a + b, 0) / carTravelTimes.length)
                                    ).toFixed(1)}s difference
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📊 <strong>Transit Efficiency</strong>
                                </span>
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: totalBusPassengers > totalCarPassengers ? '#059669' : '#dc2626'
                                }}>
                                    {totalBusPassengers > totalCarPassengers ? 'Buses Leading' :
                                        totalCarPassengers > totalBusPassengers ? 'Cars Leading' : 'Tied'}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: '#9ca3af',
                                textAlign: 'center',
                                marginTop: '4px'
                            }}>
                                {totalBusPassengers > 0 || totalCarPassengers > 0 ?
                                    `${Math.round((totalBusPassengers / (totalBusPassengers + totalCarPassengers)) * 100)}% Bus | ${Math.round((totalCarPassengers / (totalBusPassengers + totalCarPassengers)) * 100)}% Car` :
                                    'No data yet'}
                            </div>
                        </div>
                    </div>
                </div>
            )}            {/* Settings Panel - Slide in from left */}
            <div style={{
                position: 'fixed',
                top: '80px',
                left: showSettings ? '0' : '-400px',
                bottom: 0,
                width: '400px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'left 0.3s ease',
                overflowY: 'auto',
                zIndex: 25,
                boxShadow: showSettings ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : 'none'
            }}>
                <div style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                            Configuration
                        </h2>
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                color: '#6b7280'
                            }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                    </div>

                    {/* Traffic Density */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '16px'
                        }}>
                            Traffic Density
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { value: 'Low', color: '#10b981', desc: '60 cars/min', speedRange: '2-4 m/s' },
                                { value: 'Medium', color: '#f59e0b', desc: '120 cars/min', speedRange: '1.5-3 m/s' },
                                { value: 'High', color: '#ef4444', desc: '180 cars/min', speedRange: '1-2 m/s' }
                            ].map(({ value, color, desc, speedRange }) => (
                                <label
                                    key={value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px',
                                        background: settings.trafficDensity === value ?
                                            `${color}20` : 'rgba(249, 250, 251, 0.8)',
                                        border: settings.trafficDensity === value ?
                                            `2px solid ${color}` : '2px solid transparent',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="trafficDensity"
                                        value={value}
                                        checked={settings.trafficDensity === value}
                                        onChange={(e) => handleSettingChange('trafficDensity', e.target.value)}
                                        style={{ marginRight: '16px', transform: 'scale(1.2)' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px', marginBottom: '4px' }}>
                                            {value} Traffic
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                                            {desc} • {speedRange}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Scenario */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '16px'
                        }}>
                            Lane Configuration
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { value: 'With Bus Lane', icon: '🚌', desc: 'Dedicated BRT lane for buses only' },
                                { value: 'Without Bus Lane', icon: '🚗', desc: 'Mixed traffic on all lanes' }
                            ].map(({ value, icon, desc }) => (
                                <label
                                    key={value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px',
                                        background: settings.scenario === value ?
                                            'rgba(59, 130, 246, 0.1)' : 'rgba(249, 250, 251, 0.8)',
                                        border: settings.scenario === value ?
                                            '2px solid #3b82f6' : '2px solid transparent',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="scenario"
                                        value={value}
                                        checked={settings.scenario === value}
                                        onChange={(e) => handleSettingChange('scenario', e.target.value)}
                                        style={{ marginRight: '16px', transform: 'scale(1.2)' }}
                                    />
                                    <span style={{ fontSize: '24px', marginRight: '12px' }}>{icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px', marginBottom: '4px' }}>
                                            {value}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                            {desc}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Bus Schedule */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '16px'
                        }}>
                            Bus Frequency
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { value: '10mins', buses: 6, desc: 'High frequency service' },
                                { value: '20mins', buses: 4, desc: 'Medium frequency service' },
                                { value: '30mins', buses: 3, desc: 'Low frequency service' }
                            ].map(({ value, buses, desc }) => (
                                <label
                                    key={value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px',
                                        background: settings.busSchedule === value ?
                                            'rgba(139, 92, 246, 0.1)' : 'rgba(249, 250, 251, 0.8)',
                                        border: settings.busSchedule === value ?
                                            '2px solid #8b5cf6' : '2px solid transparent',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="busSchedule"
                                        value={value}
                                        checked={settings.busSchedule === value}
                                        onChange={(e) => handleSettingChange('busSchedule', e.target.value)}
                                        style={{ marginRight: '16px', transform: 'scale(1.2)' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px' }}>
                                                Every {value}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                            {desc}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* CSS for animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
                <PlotlyChart
                    totalBusPassengers={totalBusPassengers}
                    totalCarPassengers={totalCarPassengers}
                    totalPassengersAlighted={totalPassengersAlighted}
                    shouldReset={shouldResetCharts}
                />
                <TravelTimeChart
                    busTravelTimes={busTravelTimes}
                    carTravelTimes={carTravelTimes}
                    shouldReset={shouldResetCharts}
                />
            </div>
        </div>
    );
};

export default TrafficSimulation;