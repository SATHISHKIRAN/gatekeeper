const db = require('../server/src/config/database');

async function debugSettings() {
    try {
        console.log('--- Debugging Settings Table ---');
        const [rows] = await db.query('SELECT * FROM settings');
        console.log('Settings Rows:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        process.exit();
    }
}

debugSettings();
