const db = require('../config/database');

/**
 * System Service to handle automated maintenance tasks
 */
const runCleanup = async () => {
    console.log('--- Starting System Cleanup ---');
    try {
        // 1. Expire old pending requests (> 24 hours)
        const [expired] = await db.query(
            'UPDATE requests SET status = "expired" WHERE status = "pending" AND created_at < NOW() - INTERVAL 1 DAY'
        );
        console.log(`- Expired ${expired.affectedRows} old pending requests.`);

        // 2. Clear very old logs (> 30 days)
        const [logs] = await db.query(
            'DELETE FROM logs WHERE timestamp < NOW() - INTERVAL 30 DAY'
        );
        console.log(`- Cleared ${logs.affectedRows} logs older than 30 days.`);

        console.log('--- Cleanup Finished Successfully ---');
    } catch (error) {
        console.error('Cleanup Error:', error);
    }
};

// In a real production app, you'd use node-cron to run this daily
// For demo purposes, we provide a manual trigger or run on start
module.exports = { runCleanup };
