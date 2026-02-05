
const fs = require('fs');
const path = require('path');

const stopLookupPath = path.join('public', 'data', 'stop_lookup.json');

try {
    const data = fs.readFileSync(stopLookupPath, 'utf8');
    const stops = JSON.parse(data);

    console.log('Searching for "Byamaso" and "Hledan"...');

    Object.values(stops).forEach(stop => {
        const nameEn = stop.name_en ? stop.name_en.toLowerCase() : '';
        const nameMm = stop.name_mm || '';

        if (nameEn.includes('byamaso') || nameMm.includes('ဗြဟ္မစိုရ်')) {
            console.log(`Found Byamaso: ${stop.id} - ${stop.name_en} (${stop.name_mm})`);
        }
        if (nameEn.includes('hledan') || nameMm.includes('လှည်းတန်း')) {
            console.log(`Found Hledan: ${stop.id} - ${stop.name_en} (${stop.name_mm})`);
        }
    });

} catch (err) {
    console.error('Error reading or parsing stop_lookup.json:', err);
}
