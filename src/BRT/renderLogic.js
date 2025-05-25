import {
    ROAD_MAIN_PATH,
    BUS_LANE_PATH,
    FIRST_LANE_DIVIDER,
    SECOND_LANE_DIVIDER,
    BUS_STOPS,
    LEFT_EDGE,
    RIGHT_EDGE,
    COLORS
} from './constants';



export const renderCanvas = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPath(ctx, ROAD_MAIN_PATH, COLORS.ROAD);
    drawPath(ctx, BUS_LANE_PATH, COLORS.BUS_LANE);
    drawLine(ctx, FIRST_LANE_DIVIDER, COLORS.LANE_DIVIDER_SOLID, 3);
    drawLine(ctx, SECOND_LANE_DIVIDER, COLORS.LANE_DIVIDER_DOTTED, 2, [25, 20]);
    drawBusStops(ctx, BUS_STOPS);
    drawLine(ctx, LEFT_EDGE, COLORS.LANE_DIVIDER_SOLID, 2);
    drawLine(ctx, RIGHT_EDGE, COLORS.LANE_DIVIDER_SOLID, 2);
};

const drawPath = (ctx, points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
};

const drawLine = (ctx, points, strokeStyle, lineWidth, lineDash = []) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(lineDash);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
};

const drawBusStops = (ctx, busStops) => {
    busStops.forEach((busStop, index) => {
        // Ensure waitingPassengers is defined
        const waitingPassengers = busStop.waitingPassengers || 0;

        // Draw the station base
        ctx.lineWidth = 7;
        ctx.strokeStyle = COLORS.BUS_STOP_RING;
        ctx.beginPath();
        ctx.arc(busStop.x, busStop.y, busStop.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = COLORS.BUS_STOP_CENTER;
        ctx.beginPath();
        ctx.arc(busStop.x, busStop.y, busStop.radius - 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw station number and name
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Station", busStop.x, busStop.y - 12);
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`${index + 1}`, busStop.x, busStop.y + 12);

        // Draw waiting passenger visualization
        const indicatorX = busStop.x + busStop.radius + 30;
        const indicatorY = busStop.y;
        const maxRadius =100;
        const minRadius = 40;
        const maxPassengers = 20; // max expected waiting passengers

        // Calculate ratio (0 to 1)
        const passengerRatio = Math.min(waitingPassengers / maxPassengers, 1);
        
        // Calculate circle radius (between min and max)
        const indicatorRadius = minRadius + (maxRadius - minRadius) * passengerRatio;
        
        // Draw circle border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw circle fill with opacity
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Adjust font size based on radius
        const fontSize = indicatorRadius * 0.8; // e.g. 80% of radius
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${waitingPassengers}`, indicatorX, indicatorY);
        

        // Draw station roof
        ctx.beginPath();
        ctx.moveTo(busStop.x, busStop.y - busStop.radius - 10);
        ctx.lineTo(busStop.x + 15, busStop.y - busStop.radius - 25);
        ctx.lineTo(busStop.x - 15, busStop.y - busStop.radius - 25);
        ctx.closePath();
        ctx.fillStyle = COLORS.BUS_STOP_RING;
        ctx.fill();
    });
};

export const renderSimulation = (canvas, vehicles, buses, busStops, lanes, canvasWidth, canvasHeight, throughputHistory) => {
    renderCanvas(canvas);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Only include active buses.
    const activeBuses = buses.filter(bus => bus.active);
    const allVehicles = [...vehicles, ...activeBuses];

    // Draw collision warnings (if any)
    const nearCollisions = findNearCollisions(allVehicles);
    nearCollisions.forEach(collision => {
        const midX = (collision.vehicle1.x + collision.vehicle2.x) / 2;
        const midY = (collision.vehicle1.y + collision.vehicle2.y) / 2;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(midX, midY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();
    });

    // Draw each vehicle normally
    allVehicles.forEach(vehicle => {
        drawVehicle(ctx, vehicle);
    });

};

const findNearCollisions = (vehicles) => {
    const collisions = [];
    for (let i = 0; i < vehicles.length; i++) {
        for (let j = i + 1; j < vehicles.length; j++) {
            const v1 = vehicles[i];
            const v2 = vehicles[j];
            const dx = v1.x - v2.x;
            const dy = v1.y - v2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minSafeWidth = (v1.width + v2.width) / 2 * 0.9;
            const minSafeHeight = (v1.height + v2.height) / 2 * 0.9;
            const minSafeDist = Math.sqrt(minSafeWidth * minSafeWidth + minSafeHeight * minSafeHeight);
            const collisionThreshold = minSafeDist * 0.7;
            const warningThreshold = minSafeDist * 1.2;
            if (distance < warningThreshold && distance > collisionThreshold) {
                collisions.push({
                    vehicle1: v1,
                    vehicle2: v2,
                    distance: distance,
                    severity: 1 - (distance / warningThreshold)
                });
            }
        }
    }
    return collisions;
};

const drawVehicle = (ctx, vehicle) => {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);
    ctx.fillStyle = vehicle.color;
    const cornerRadius = vehicle.height / 8;
    if (vehicle.type === 'car') {
        drawCar(ctx, vehicle, cornerRadius);
    } else {
        drawBus(ctx, vehicle, cornerRadius);
    }
    ctx.restore();
};

const drawCar = (ctx, vehicle, cornerRadius) => {
    drawRoundedRect(ctx, -vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height, cornerRadius);
    const windowInset = vehicle.height / 5;
    ctx.fillStyle = COLORS.WINDOWS;
    ctx.beginPath();
    const windowLeft = -vehicle.width / 2 + vehicle.width / 5;
    const windowWidth = vehicle.width / 2;
    ctx.roundRect(windowLeft, -vehicle.height / 2 + windowInset, windowWidth, vehicle.height - (windowInset * 2), [windowInset / 2]);
    ctx.fill();
    ctx.fillStyle = COLORS.HEADLIGHTS;
    const headlightSize = vehicle.height / 4;
    const headlightX = vehicle.width / 2 - headlightSize;
    ctx.beginPath();
    ctx.arc(headlightX, -vehicle.height / 3, headlightSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headlightX, vehicle.height / 3, headlightSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Add brake lights
    const tailLightSize = vehicle.height / 4;
    const tailLightX = -vehicle.width / 2 + tailLightSize;

    // Check if car is slowing down or stopped
    const isBraking = vehicle.waiting ||
        (vehicle.lastSpeed && vehicle.speed < vehicle.lastSpeed * 0.8) ||
        vehicle.speed < 0.1;

    // Draw brake lights
    ctx.fillStyle = isBraking ? '#FF0000' : '#660000'; // Bright red when braking, dark red when not
    ctx.beginPath();
    ctx.arc(tailLightX, -vehicle.height / 3, tailLightSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tailLightX, vehicle.height / 3, tailLightSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect when braking
    if (isBraking) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(tailLightX, -vehicle.height / 3, tailLightSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tailLightX, vehicle.height / 3, tailLightSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};

const drawBus = (ctx, vehicle, cornerRadius) => {
    drawRoundedRect(ctx, -vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height, cornerRadius);
    ctx.fillStyle = COLORS.WINDOWS;
    const windowCount = 4;
    const windowHeight = vehicle.height * 0.7;
    const windowWidth = vehicle.width / 10;
    const windowSpacing = vehicle.width / (windowCount + 1);
    const windowInset = (vehicle.height - windowHeight) / 2;
    for (let i = 0; i < windowCount; i++) {
        ctx.beginPath();
        ctx.roundRect(-vehicle.width / 2 + (i + 1) * windowSpacing - windowWidth / 2, -vehicle.height / 2 + windowInset, windowWidth, windowHeight, [windowWidth / 4]);
        ctx.fill();
    }

    // Draw bus ID and passenger count
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.round(vehicle.height / 5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${vehicle.busId}`, -vehicle.width / 4, -vehicle.height / 2 - 10);

    // Draw passenger count
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.round(vehicle.height / 6)}px Arial`;
    ctx.fillText(`${vehicle.passengers}/${vehicle.capacity}`, 0, vehicle.height / 4);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-vehicle.width / 4, -vehicle.height / 2 - 10, vehicle.height / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.round(vehicle.height / 5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${vehicle.busId}`, -vehicle.width / 4, -vehicle.height / 2 - 10);
    ctx.fillStyle = COLORS.HEADLIGHTS;
    const headlightSize = vehicle.height / 4;
    const headlightX = vehicle.width / 2 - headlightSize;
    ctx.beginPath();
    ctx.arc(headlightX, -vehicle.height / 3, headlightSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headlightX, vehicle.height / 3, headlightSize / 2, 0, Math.PI * 2);
    ctx.fill();
    if (vehicle.waiting) {
        ctx.fillStyle = COLORS.BRAKE_LIGHTS;
        const tailLightX = -vehicle.width / 2 + headlightSize;
        ctx.beginPath();
        ctx.arc(tailLightX, -vehicle.height / 3, headlightSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tailLightX, vehicle.height / 3, headlightSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    if (vehicle.stoppedAtBusStop >= 0) {
        ctx.fillStyle = COLORS.STOP_INDICATOR;
        ctx.beginPath();
        ctx.arc(0, 0, vehicle.height / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.STOP_TEXT;
        ctx.font = `bold ${Math.round(vehicle.height / 3)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STOP', 0, 0);
        ctx.font = `bold ${Math.round(vehicle.height / 5)}px Arial`;
        ctx.fillText(`#${vehicle.stoppedAtBusStop + 1}`, 0, vehicle.height / 4);
    }
    if (vehicle.justLeftStop) {
        ctx.fillStyle = '#00AA00';
        ctx.beginPath();
        ctx.arc(0, -vehicle.height / 2 - 10, vehicle.height / 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(vehicle.height / 5)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GO', 0, -vehicle.height / 2 - 10);
    }
    if (vehicle.stuckTimer > 1500 && vehicle.stoppedAtBusStop === -1) {
        let warningColor = '#FF6600';
        if (vehicle.stuckTimer > 4000) {
            warningColor = '#FF0000';
        } else if (vehicle.stuckTimer > 2000) {
            warningColor = '#FF3300';
        }
        ctx.fillStyle = warningColor;
        ctx.beginPath();
        ctx.arc(vehicle.width / 4, -vehicle.height / 2 - 10, vehicle.height / 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(vehicle.height / 5)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const exclamations = vehicle.stuckTimer > 4000 ? '!!!' : vehicle.stuckTimer > 2000 ? '!!' : '!';
        ctx.fillText(exclamations, vehicle.width / 4, -vehicle.height / 2 - 10);
    }
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    ctx.fill();
};

// Add throughput visualization
const drawThroughputGraph = (ctx, throughputHistory, canvasWidth, canvasHeight) => {
    if (!throughputHistory || throughputHistory.length === 0) return;

    // Graph dimensions and position
    const graphWidth = 300;
    const graphHeight = 200;
    const graphX = 50;  // Position from left
    const graphY = 50;  // Position from top
    const padding = 30;
    const axisX = graphX + padding;
    const axisY = graphY + graphHeight - padding;
    const pointSpacing = (graphWidth - 2 * padding) / 9;

    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(graphX, graphY, graphWidth, graphHeight);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(graphX, graphY, graphWidth, graphHeight);

    // Draw title
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText('Passenger Throughput (Point A to B)', graphX + padding, graphY + 20);

    // Draw legend
    const legendY = graphY + 40;
    ctx.font = '12px Arial';

    // Bus legend
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(graphX + padding, legendY, 20, 10);
    ctx.fillStyle = '#000';
    ctx.fillText('Bus Passengers', graphX + padding + 25, legendY + 8);

    // Car legend
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(graphX + padding + 120, legendY, 20, 10);
    ctx.fillStyle = '#000';
    ctx.fillText('Car Passengers', graphX + padding + 145, legendY + 8);

    // Total legend
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(graphX + padding + 240, legendY, 20, 10);
    ctx.fillStyle = '#000';
    ctx.fillText('Total', graphX + padding + 265, legendY + 8);

    // Calculate scale
    const maxPassengers = Math.max(
        ...throughputHistory.map(data => Math.max(data.buses, data.cars, data.totalPassengers))
    );
    const scaleY = (graphHeight - 2 * padding) / (maxPassengers || 1);

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.moveTo(axisX, graphY + padding);
    ctx.lineTo(axisX, axisY);
    ctx.lineTo(graphX + graphWidth - padding, axisY);
    ctx.stroke();

    // Draw y-axis labels
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxPassengers * i) / 5);
        const y = axisY - (value * scaleY);
        ctx.fillText(value.toString(), graphX + 10, y + 3);
    }

    // Draw bus passengers
    ctx.beginPath();
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    throughputHistory.slice(-10).forEach((data, i) => {
        const x = axisX + i * pointSpacing;
        const y = axisY - data.buses * scaleY;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw car passengers
    ctx.beginPath();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    throughputHistory.slice(-10).forEach((data, i) => {
        const x = axisX + i * pointSpacing;
        const y = axisY - data.cars * scaleY;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw total passengers
    ctx.beginPath();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    throughputHistory.slice(-10).forEach((data, i) => {
        const x = axisX + i * pointSpacing;
        const y = axisY - data.totalPassengers * scaleY;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw time labels (in seconds)
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    throughputHistory.slice(-10).forEach((data, i) => {
        const x = axisX + i * pointSpacing;
        const time = Math.floor((Date.now() - data.timestamp) / 1000);
        ctx.fillText(time + 's', x - 10, axisY + 15);
    });
};

// Modify the main render function to include throughput visualization
export const render = (ctx, vehicles, buses, busStops, lanes, canvasWidth, canvasHeight, throughputHistory) => {
    // ... existing rendering code ...

    // Draw throughput graph
    drawThroughputGraph(ctx, throughputHistory, canvasWidth, canvasHeight);
};