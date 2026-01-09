const db = require('../src/config/database');
require('dotenv').config({ path: '../.env' });

const userId = process.argv[2] || 540;

async function check() {
    console.log(`Checking Request Status for User ${userId}...`);
    try {
        const [rows] = await db.query('SELECT id, user_id, type, status, category FROM requests WHERE user_id = ?', [userId]);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) { console.error(e); }
    process.exit(0);
}

check();
