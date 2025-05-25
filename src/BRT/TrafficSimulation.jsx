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
import PlotlyChart from './ThroughputChart';
import TravelTimeChart from './TravelTimeChart';

const TrafficSimulation = () => {
    // Simplified settings with three key parameters
    const [settings, setSettings] = useState({
        trafficDensity: 'Medium', // Low, Medium, High
        scenario: 'With Bus Lane', // With Bus Lane, Without Bus Lane
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
    const [showSettings, setShowSettings] = useState(true);
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
            randomEvents: true
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
        // Reset all passenger counts and throughput data
        setTotalBusPassengers(0);
        setTotalCarPassengers(0);
        setThroughputHistory([]);
        throughputHistoryRef.current = [];

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
                    setTotalCarPassengers(prev => prev + 3);
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
        <div
            style={{
                minHeight: '100vh',
                padding: '8px',
                background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)'
            }}
        >
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#111827',
                        marginBottom: '8px'
                    }}>
                        BRT Traffic Simulation
                    </h1>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        fontSize: '16px'
                    }}>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '20px',
                            fontWeight: '500',
                            fontSize: '14px'
                        }}>
                            {settings.scenario}
                        </span>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            borderRadius: '20px',
                            fontWeight: '500',
                            fontSize: '14px'
                        }}>
                            {settings.trafficDensity} Traffic
                        </span>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: '#f3e8ff',
                            color: '#7c2d12',
                            borderRadius: '20px',
                            fontWeight: '500',
                            fontSize: '14px'
                        }}>
                            Every {settings.busSchedule}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Top Section: Settings and Simulation Side by Side */}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Settings Panel */}
                        <div style={{ width: '100%', maxWidth: '384px', flexShrink: 0 }}>
                            <div
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '24px'
                                }}>
                                    <h2 style={{
                                        fontSize: '20px',
                                        fontWeight: '600',
                                        color: '#1f2937'
                                    }}>
                                        Settings
                                    </h2>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={handleSetup}
                                            style={{
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.2s'
                                            }}
                                            title="Reset & Apply Settings"
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                        <button
                                            onClick={toggleSimulation}
                                            style={{
                                                backgroundColor: isRunning ? '#ef4444' : '#3b82f6',
                                                color: 'white',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.2s'
                                            }}
                                            title={isRunning ? "Pause Simulation" : "Start Simulation"}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = isRunning ? '#dc2626' : '#2563eb'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = isRunning ? '#ef4444' : '#3b82f6'}
                                        >
                                            {isRunning ? <Pause size={18} /> : <Play size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* Traffic Density */}
                                    <div>
                                        <h3 style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Traffic Density
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                { value: 'Low', color: 'green', desc: '60 cars/min' },
                                                { value: 'Medium', color: 'yellow', desc: '120 cars/min' },
                                                { value: 'High', color: 'red', desc: '180 cars/min' }
                                            ].map(({ value, color, desc }) => (
                                                <label
                                                    key={value}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        backgroundColor: '#f9fafb',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="trafficDensity"
                                                        value={value}
                                                        checked={settings.trafficDensity === value}
                                                        onChange={(e) => handleSettingChange('trafficDensity', e.target.value)}
                                                        style={{ marginRight: '12px' }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                                                                {value}
                                                            </span>
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                fontSize: '12px',
                                                                borderRadius: '4px',
                                                                backgroundColor: color === 'green' ? '#dcfce7' : color === 'yellow' ? '#fef3c7' : '#fee2e2',
                                                                color: color === 'green' ? '#166534' : color === 'yellow' ? '#92400e' : '#991b1b'
                                                            }}>
                                                                {desc}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Scenario */}
                                    <div>
                                        <h3 style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Lane Configuration
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                { value: 'With Bus Lane', icon: '🚌', desc: 'Dedicated BRT lane' },
                                                { value: 'Without Bus Lane', icon: '🚗', desc: 'Mixed traffic' }
                                            ].map(({ value, icon, desc }) => (
                                                <label
                                                    key={value}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        backgroundColor: '#f9fafb',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="scenario"
                                                        value={value}
                                                        checked={settings.scenario === value}
                                                        onChange={(e) => handleSettingChange('scenario', e.target.value)}
                                                        style={{ marginRight: '12px' }}
                                                    />
                                                    <span style={{ fontSize: '16px', marginRight: '8px' }}>{icon}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                                                            {value}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                            {desc}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bus Schedule */}
                                    <div>
                                        <h3 style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Bus Frequency
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                { value: '10mins', buses: 6, desc: 'High frequency' },
                                                { value: '20mins', buses: 4, desc: 'Medium frequency' },
                                                { value: '30mins', buses: 3, desc: 'Low frequency' }
                                            ].map(({ value, buses, desc }) => (
                                                <label
                                                    key={value}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        backgroundColor: '#f9fafb',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="busSchedule"
                                                        value={value}
                                                        checked={settings.busSchedule === value}
                                                        onChange={(e) => handleSettingChange('busSchedule', e.target.value)}
                                                        style={{ marginRight: '12px' }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                                                                Every {value}
                                                            </span>
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                fontSize: '12px',
                                                                backgroundColor: '#dbeafe',
                                                                color: '#1e40af',
                                                                borderRadius: '4px'
                                                            }}>
                                                                {buses} buses
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                            {desc}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* System Parameters */}
                                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                        <h3 style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Calculated Parameters
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#6b7280' }}>Cars per minute:</span>
                                                <span style={{ fontWeight: '500' }}>{currentParams.carsPerMinute}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#6b7280' }}>Number of buses:</span>
                                                <span style={{ fontWeight: '500' }}>{currentParams.busCount}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#6b7280' }}>Speed range:</span>
                                                <span style={{ fontWeight: '500' }}>{currentParams.minSpeed}-{currentParams.maxSpeed} m/s</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Live Stats */}
                            {isSetup && (
                                <div
                                    style={{
                                        marginTop: '24px',
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        padding: '24px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    {/* Live Statistics Section */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            color: '#1f2937',
                                            marginBottom: '16px'
                                        }}>
                                            Live Statistics
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '14px', color: '#6b7280' }}>Active Buses</span>
                                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                                                    {activeBusCount}/{currentParams.busCount}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Vehicles</span>
                                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    {vehicles.length}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '14px', color: '#6b7280' }}>Traffic Density</span>
                                                <span style={{
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    color: trafficDensity > 75 ? '#dc2626' : trafficDensity > 50 ? '#d97706' : '#059669'
                                                }}>
                                                    {trafficDensity}%
                                                </span>
                                            </div>

                                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '12px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                                    Driver Behavior
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                        <span style={{ color: '#2563eb' }}>Polite:</span>
                                                        <span style={{ fontWeight: '500' }}>{driverStats.polite}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                        <span style={{ color: '#059669' }}>Neutral:</span>
                                                        <span style={{ fontWeight: '500' }}>{driverStats.neutral}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                        <span style={{ color: '#dc2626' }}>Aggressive:</span>
                                                        <span style={{ fontWeight: '500' }}>{driverStats.aggressive}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '12px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                                    Passenger Throughput
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '14px', color: '#2563eb' }}>Bus Passengers:</span>
                                                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                                                            {totalBusPassengers + totalPassengersAlighted}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '14px', color: '#059669' }}>Car Passengers:</span>
                                                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                                                            {totalCarPassengers}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '14px', color: '#2563eb' }}>Total Passengers Alighted:</span>
                                                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                                                            {totalPassengersAlighted}
                                                        </span>
                                                    </div>

                                                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Total:</span>
                                                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c2d12' }}>
                                                                {totalBusPassengers + totalCarPassengers}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Main Simulation Area */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    marginBottom: '24px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px',
                                    gap: '8px'
                                }}>
                                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                                        Traffic Simulation
                                    </h2>
                                    {!isSetup && (
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#6b7280',
                                            backgroundColor: '#f3f4f6',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            alignSelf: 'flex-start'
                                        }}>
                                            Click setup to begin
                                        </div>
                                    )}
                                    {isSetup && !isRunning && (
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#ea580c',
                                            backgroundColor: '#fed7aa',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            alignSelf: 'flex-start'
                                        }}>
                                            Simulation paused
                                        </div>
                                    )}
                                    {isSetup && isRunning && (
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#059669',
                                            backgroundColor: '#d1fae5',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            alignSelf: 'flex-start'
                                        }}>
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                backgroundColor: '#10b981',
                                                borderRadius: '50%',
                                                marginRight: '8px',
                                                animation: 'pulse 2s infinite'
                                            }}></div>
                                            Running
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
                                    <canvas
                                        ref={canvasRef}
                                        width={CANVAS_WIDTH}
                                        height={CANVAS_HEIGHT}
                                        style={{
                                            border: '2px solid #d1d5db',
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                                            maxWidth: '100%',
                                            height: 'auto'
                                        }}
                                    />
                                </div>

                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <div style={{
                                        display: 'inline-flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '24px',
                                        fontSize: '14px',
                                        color: '#6b7280'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '8px',
                                                backgroundColor: '#3b82f6',
                                                borderRadius: '2px',
                                                marginRight: '8px'
                                            }}></div>
                                            <span>Buses</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '8px',
                                                backgroundColor: '#ef4444',
                                                borderRadius: '2px',
                                                marginRight: '8px'
                                            }}></div>
                                            <span>Cars</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '8px',
                                                backgroundColor: '#fbbf24',
                                                borderRadius: '2px',
                                                marginRight: '8px'
                                            }}></div>
                                            <span>Bus Stops</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '4px',
                                                backgroundColor: '#9ca3af',
                                                marginRight: '8px'
                                            }}></div>
                                            <span>Road Lanes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Chart Section */}
                            <div style={{
                                width: '100%',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '16px',
                                alignItems: 'start'
                            }}>
                                <PlotlyChart
                                    totalBusPassengers={totalBusPassengers}
                                    totalCarPassengers={totalCarPassengers}
                                />
                                <TravelTimeChart
                                    busTravelTimes={busTravelTimes}
                                    carTravelTimes={carTravelTimes}
                                />
                            </div>
                            {/* Instructions */}
                            <div
                                style={{
                                    marginTop: '32px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    marginBottom: '16px'
                                }}>
                                    How to Use This Simulation
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                    gap: '24px',
                                    fontSize: '14px',
                                    color: '#6b7280'
                                }}>
                                    <div>
                                        <h4 style={{ fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                                            🎛️ Configure Settings
                                        </h4>
                                        <p>Choose traffic density (Low/Medium/High), lane configuration (with or without BRT), and bus frequency to test different scenarios.</p>
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                                            ▶️ Run Simulation
                                        </h4>
                                        <p>Click the green setup button to apply settings, then the blue play button to start the traffic simulation and observe real-time behavior.</p>
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                                            📊 Analyze Results
                                        </h4>
                                        <p>Monitor passenger throughput in the chart to compare efficiency between scenarios and understand BRT benefits.</p>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: '24px',
                                    padding: '16px',
                                    backgroundColor: '#eff6ff',
                                    borderRadius: '8px'
                                }}>
                                    <h4 style={{ fontWeight: '500', color: '#1e40af', marginBottom: '8px' }}>
                                        💡 Research Tips
                                    </h4>
                                    <p style={{ fontSize: '14px', color: '#1e40af' }}>
                                        Compare scenarios systematically: try the same traffic density with and without bus lanes,
                                        then test different bus frequencies. Look for the passenger throughput "sweet spot" that
                                        maximizes efficiency while considering operational costs.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrafficSimulation;