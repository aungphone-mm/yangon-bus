
const fs = require('fs');
const path = require('path');

const stopLookupPath = path.join('public', 'data', 'stop_lookup.json');

try {
    const data = fs.readFileSync(stopLookupPath, 'utf8');
    const lookup = JSON.parse(data);
    const stops = lookup.stops;

    const idsToCheck = [2457, 287, 288];

    idsToCheck.forEach(id => {
        const stop = stops[id];
        if (stop) {
            console.log(`ID: ${id}`);
            console.log(`Name: ${stop.name_en}`);
            console.log(`Lat: ${stop.lat}, Lng: ${stop.lng}`);
            console.log('---');
        } else {
            console.log(`Stop ${id} not found`);
        }
    });

} catch (err) {
    console.error('Error:', err);
}
