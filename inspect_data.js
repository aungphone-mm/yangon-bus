
const fs = require('fs');
const path = require('path');

const stopLookupPath = path.join('public', 'data', 'stop_lookup.json');

try {
    const data = fs.readFileSync(stopLookupPath, 'utf8');
    const stops = JSON.parse(data);

    console.log('Total stops:', Object.keys(stops).length);
    console.log('First 5 stops:');

    const entries = Object.values(stops).slice(0, 5);
    console.log(JSON.stringify(entries, null, 2));

} catch (err) {
    console.error('Error reading or parsing stop_lookup.json:', err);
}
