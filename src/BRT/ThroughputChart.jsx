import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';

const PlotlyChart = ({ totalBusPassengers = 0, totalCarPassengers = 0, totalPassengersAlighted = 0, shouldReset = false }) => {
    const plotRef = useRef(null);
    const [dataHistory, setDataHistory] = useState([]);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        const currentTime = (Date.now() - startTimeRef.current) / 1000; // Time in seconds
        const totalBusCount = totalBusPassengers + totalPassengersAlighted;
        const totalPassengers = totalBusCount + totalCarPassengers;

        // Update data history
        setDataHistory(prev => {
            const newEntry = {
                time: currentTime,
                busPassengers: totalBusCount,
                carPassengers: totalCarPassengers,
                totalPassengers: totalPassengers
            };

            // Keep only last 100 data points to prevent memory issues
            const updated = [...prev, newEntry];
            return updated.length > 100 ? updated.slice(-100) : updated;
        });
    }, [totalBusPassengers, totalCarPassengers, totalPassengersAlighted]);

    useEffect(() => {
        if (!plotRef.current || dataHistory.length === 0) return;

        const timePoints = dataHistory.map(d => d.time);
        const busData = dataHistory.map(d => d.busPassengers);
        const carData = dataHistory.map(d => d.carPassengers);
        const totalData = dataHistory.map(d => d.totalPassengers);

        const trace1 = {
            type: 'scatter',
            x: timePoints,
            y: busData,
            mode: 'lines+markers',
            name: 'Bus Passengers',
            line: {
                color: 'rgb(55, 128, 191)',
                width: 3
            },
            marker: {
                size: 4
            }
        };

        const trace2 = {
            type: 'scatter',
            x: timePoints,
            y: carData,
            mode: 'lines+markers',
            name: 'Car Passengers',
            line: {
                color: 'rgb(219, 64, 82)',
                width: 2
            },
            marker: {
                size: 4
            }
        };

        const trace3 = {
            type: 'scatter',
            x: timePoints,
            y: totalData,
            mode: 'lines+markers',
            name: 'Total Passengers',
            line: {
                color: 'rgb(50, 171, 96)',
                width: 2
            },
            marker: {
                size: 4
            }
        };

        const layout = {
            title: {
                text: 'Passenger Throughput',
                font: {
                    size: 16
                }
            },
            width: 450,
            height: 300,
            xaxis: {
                title: 'Time (seconds)',
                showgrid: true,
                titlefont: {
                    size: 12
                }
            },
            yaxis: {
                title: 'Passengers Delivered',
                showgrid: true,
                titlefont: {
                    size: 12
                }
            },
            legend: {
                x: 0,
                y: 1,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                font: {
                    size: 10
                }
            },
            margin: {
                l: 50,
                r: 20,
                t: 40,
                b: 40
            }
        };

        const data = [trace1, trace2, trace3];

        // Use Plotly.react for smooth updates
        Plotly.react(plotRef.current, data, layout);
    }, [dataHistory]);

    useEffect(() => {
        // Reset effect
        if (shouldReset) {
            setDataHistory([]);
            startTimeRef.current = Date.now();

            // Reinitialize empty plot
            if (plotRef.current) {
                const initialData = [{
                    type: 'scatter',
                    x: [],
                    y: [],
                    mode: 'lines+markers',
                    name: 'Bus Passengers'
                }];

                const initialLayout = {
                    title: {
                        text: 'Passenger Throughput',
                        font: {
                            size: 16
                        }
                    },
                    width: 450,
                    height: 300,
                    xaxis: {
                        title: 'Time (seconds)',
                        titlefont: {
                            size: 12
                        }
                    },
                    yaxis: {
                        title: 'Passengers Delivered',
                        titlefont: {
                            size: 12
                        }
                    },
                    margin: {
                        l: 50,
                        r: 20,
                        t: 40,
                        b: 40
                    }
                };

                Plotly.newPlot(plotRef.current, initialData, initialLayout);
            }
        }
    }, [shouldReset]);

    return (
        <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            marginTop: '16px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600'
                }}>
                    Passenger Throughput Chart
                </h3>
            </div>
            <div ref={plotRef} id="throughputChart"></div>
            <div style={{
                marginTop: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                fontSize: '14px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontWeight: '600',
                        color: '#2563eb'
                    }}>
                        Bus Passengers
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        {totalBusPassengers + totalPassengersAlighted}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontWeight: '600',
                        color: '#dc2626'
                    }}>
                        Car Passengers
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        {totalCarPassengers}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontWeight: '600',
                        color: '#059669'
                    }}>
                        Total Passengers
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        {totalBusPassengers + totalPassengersAlighted + totalCarPassengers}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlotlyChart;