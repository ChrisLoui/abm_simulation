// Add throughput tracking function
export const updateThroughput = (vehicles, buses) => {
    let carThroughput = 0;
    let busThroughput = 0;

    // Count car throughput (3 passengers per car that completes a full loop)
    vehicles.forEach(vehicle => {
        if (vehicle.type === 'car' && vehicle.pathPosition > 0.95) {
            carThroughput += 3; // Each car has exactly 3 passengers
            vehicle.pathPosition = 0; // Reset position to start
        }
    });

    // Count bus throughput (passengers dropped off + passengers on bus when it exits)
    buses.forEach(bus => {
        if (bus.active) {
            // Count passengers dropped off at stations
            if (bus.justLeftStop) {
                const passengersDroppedOff = bus.passengersDroppedOff || 0;
                busThroughput += passengersDroppedOff;
                bus.passengersDroppedOff = 0; // Reset after counting
                bus.justLeftStop = false;
            }

            // Count passengers on bus when it exits the simulation (point A to B)
            if (bus.pathPosition > 0.95) {
                // Only count if we haven't counted this bus's exit yet
                if (!bus.throughputCounted) {
                    busThroughput += bus.passengers || 0;
                    bus.throughputCounted = true;
                    // Reset bus position and reactivate it
                    bus.pathPosition = 0;
                    bus.active = false;
                    // Schedule reactivation after a delay
                    setTimeout(() => {
                        bus.active = true;
                        bus.throughputCounted = false;
                        bus.passengers = Math.floor(Math.random() * 21) + 70; // Reset passengers
                    }, 10000); // 10 seconds delay before reactivating
                }
            }
        }
    });

    const totalPassengers = carThroughput + busThroughput;

    // Always return an object with all required properties
    return {
        cars: carThroughput,
        buses: busThroughput,
        totalPassengers: totalPassengers,
        timestamp: Date.now()
    };
};