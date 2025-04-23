import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ThroughputChart = ({ throughputHistory }) => {
    // Transform data for Recharts
    const chartData = throughputHistory.map(data => {
        const timeInSeconds = Math.floor((Date.now() - data.timestamp) / 1000);
        const timeInMinutes = timeInSeconds / 3.12; // Convert to minutes (10 seconds = 3.12 minutes)
        return {
            time: timeInMinutes,
            totalPassengers: data.totalPassengers || 0
        };
    }).slice(-30); // Show last 30 data points

    const formatTime = (value) => {
        if (typeof value === 'number' && !isNaN(value)) {
            return value.toFixed(2);
        }
        return '0.00';
    };

    return (
        <div style={{
            width: '500px',
            height: '200px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #000'
        }}>
            <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', textAlign: 'center' }}>Total Passenger Throughput</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        label={{ value: 'Time (minutes)', position: 'bottom' }}
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={formatTime}
                    />
                    <YAxis
                        label={{ value: 'Total Passengers', angle: -90, position: 'left' }}
                    />
                    <Tooltip
                        formatter={(value) => [`${value} passengers`, 'Total Passengers']}
                        labelFormatter={(label) => `${formatTime(label)} minutes`}
                    />
                    <Line
                        type="monotone"
                        dataKey="totalPassengers"
                        stroke="#4CAF50"
                        name="Total Passengers"
                        dot={false}
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ThroughputChart;