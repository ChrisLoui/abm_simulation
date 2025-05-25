import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';

const TravelTimeChart = ({ busTravelTimes = [], carTravelTimes = [] }) => {
    const plotRef = useRef(null);
    const [dataHistory, setDataHistory] = useState([]);
    const startTimeRef = useRef(Date.now());

    // Convert simulation seconds to real-life minutes
    const convertToRealTime = (simulationSeconds) => simulationSeconds;

    // Format time display
    const formatTime = (minutes) => {
        if (minutes < 60) {
            return `${minutes.toFixed(1)} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes.toFixed(1)}min`;
    };

    useEffect(() => {
        const currentTime = (Date.now() - startTimeRef.current) / 1000; // Time in simulation seconds

        // Calculate averages and convert to real-life minutes
        const avgBusTime = busTravelTimes.length > 0
            ? convertToRealTime(busTravelTimes.reduce((a, b) => a + b, 0) / busTravelTimes.length)
            : 0;
        const avgCarTime = carTravelTimes.length > 0
            ? convertToRealTime(carTravelTimes.reduce((a, b) => a + b, 0) / carTravelTimes.length)
            : 0;

        // Update data history
        setDataHistory(prev => {
            const newEntry = {
                time: currentTime,
                avgBusTime: avgBusTime,
                avgCarTime: avgCarTime
            };

            // Keep only last 100 data points to prevent memory issues
            const updated = [...prev, newEntry];
            return updated.length > 100 ? updated.slice(-100) : updated;
        });
    }, [busTravelTimes, carTravelTimes]);

    useEffect(() => {
        if (!plotRef.current || dataHistory.length === 0) return;

        const timePoints = dataHistory.map(d => d.time);
        const busData = dataHistory.map(d => d.avgBusTime);
        const carData = dataHistory.map(d => d.avgCarTime);

        const trace1 = {
            type: 'scatter',
            x: timePoints,
            y: busData,
            mode: 'lines+markers',
            name: 'Bus Travel Time',
            line: {
                color: 'rgb(55, 128, 191)',
                width: 3
            },
            marker: {
                size: 4
            },
            hovertemplate: '%{y:.1f} min<extra></extra>'
        };

        const trace2 = {
            type: 'scatter',
            x: timePoints,
            y: carData,
            mode: 'lines+markers',
            name: 'Car Travel Time',
            line: {
                color: 'rgb(219, 64, 82)',
                width: 2
            },
            marker: {
                size: 4
            },
            hovertemplate: '%{y:.1f} min<extra></extra>'
        };

        const layout = {
            title: {
                text: 'Travel Time',
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
                title: 'Minutes',
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
            },
            annotations: [{
                text: '1s = 1min',
                xref: 'paper',
                yref: 'paper',
                x: 1,
                xanchor: 'right',
                y: 1,
                yanchor: 'bottom',
                showarrow: false,
                font: {
                    size: 10,
                    color: '#666'
                }
            }]
        };

        const data = [trace1, trace2];

        // Use Plotly.react for smooth updates
        Plotly.react(plotRef.current, data, layout);
    }, [dataHistory]);

    useEffect(() => {
        // Initialize empty plot
        if (plotRef.current) {
            const initialData = [{
                type: 'scatter',
                x: [],
                y: [],
                mode: 'lines+markers',
                name: 'Bus Travel Time'
            }];

            const initialLayout = {
                title: {
                    text: 'Travel Time',
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
                    title: 'Minutes',
                    titlefont: {
                        size: 12
                    }
                },
                margin: {
                    l: 50,
                    r: 20,
                    t: 40,
                    b: 40
                },
                annotations: [{
                    text: '1s = 1min',
                    xref: 'paper',
                    yref: 'paper',
                    x: 1,
                    xanchor: 'right',
                    y: 1,
                    yanchor: 'bottom',
                    showarrow: false,
                    font: {
                        size: 10,
                        color: '#666'
                    }
                }]
            };

            Plotly.newPlot(plotRef.current, initialData, initialLayout);
        }

        // Cleanup function
        return () => {
            if (plotRef.current) {
                Plotly.purge(plotRef.current);
            }
        };
    }, []);


    // Calculate current averages for display
    const currentBusAvg = busTravelTimes.length > 0
        ? convertToRealTime(busTravelTimes.reduce((a, b) => a + b, 0) / busTravelTimes.length)
        : 0;
    const currentCarAvg = carTravelTimes.length > 0
        ? convertToRealTime(carTravelTimes.reduce((a, b) => a + b, 0) / carTravelTimes.length)
        : 0;

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
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '4px'
                    }}>
                        Travel Time Analysis
                    </h3>
                    <div style={{
                        fontSize: '12px',
                        color: '#666',
                        fontStyle: 'italic'
                    }}>
                        1 simulation second = 1 real minute
                    </div>
                </div>
            </div>
            <div ref={plotRef} id="travelTimeChart"></div>
            <div style={{
                marginTop: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                fontSize: '14px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontWeight: '600',
                        color: '#2563eb'
                    }}>
                        Average Bus Travel Time
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        {formatTime(currentBusAvg)}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontWeight: '600',
                        color: '#dc2626'
                    }}>
                        Average Car Travel Time
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        {formatTime(currentCarAvg)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelTimeChart;