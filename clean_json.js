
const fs = require('fs');

try {
    const raw = fs.readFileSync('valid_questions.json', 'utf8');
    const data = JSON.parse(raw);

    function clean(obj) {
        if (typeof obj === 'string') {
            return obj.replace(/`/g, '');
        }
        if (Array.isArray(obj)) {
            return obj.map(clean);
        }
        if (typeof obj === 'object' && obj !== null) {
            const newObj = {};
            for (const key in obj) {
                newObj[key] = clean(obj[key]);
            }
            return newObj;
        }
        return obj;
    }

    const cleanedData = clean(data);

    // JSON.stringify is equivalent to json.dump
    fs.writeFileSync('valid_questions.json', JSON.stringify(cleanedData, null, 2), 'utf8');
    console.log('Success: valid_questions.json cleaned.');
} catch (e) {
    console.error('Error:', e);
}
