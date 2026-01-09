const db = require('../src/config/database');
require('dotenv').config({ path: '../.env' });

async function clearLogs() {
    console.log('🧹 Clearing All System Logs and History...');
    try {
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Deleting from logs...');
        await db.query('TRUNCATE TABLE logs');

        console.log('Deleting from notifications...');
        await db.query('TRUNCATE TABLE notifications');

        console.log('Deleting from requests...');
        await db.query('TRUNCATE TABLE requests');

        // Optional: clear standard logs if they exist
        // await db.query('TRUNCATE TABLE staff_actions'); 

        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ All specified logs cleared successfully.');
    } catch (e) {
        console.error('❌ Failed to clear logs:', e.message);
    }
    process.exit(0);
}

clearLogs();
