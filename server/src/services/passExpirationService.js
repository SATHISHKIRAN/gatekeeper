const db = require('../config/database');
const { sendNotification } = require('../controllers/notificationController');

/**
 * Service to automatically expire passes if the student has not exited within the breakdown limit.
 * Config: 2 hours after scheduled departure_date.
 */
const runPassExpirationCheck = async () => {
    try {
        console.log('[CRON] Running Pass Expiration Check...');
        const bufferHours = 2; // Hours after departure to expire

        // Find passes that are:
        // 1. Approved (hod/warden) or Active (if logic varies, but usually exit makes it active. Before exit it is approved)
        // 2. Departure date was more than 2 hours ago
        // 3. No 'exit' log exists for this request
        // 4. Status is NOT already 'expired', 'cancelled', 'rejected', 'completed'

        const [overduePasses] = await db.query(`
            SELECT r.id, r.user_id, r.departure_date, u.name, u.email
            FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE r.status IN ('approved_hod', 'approved_warden', 'approved_staff', 'generated')
            AND r.departure_date < DATE_SUB(NOW(), INTERVAL ? HOUR)
            AND NOT EXISTS (
                SELECT 1 FROM logs l WHERE l.request_id = r.id AND l.action = 'exit'
            )
        `, [bufferHours]);

        if (overduePasses.length > 0) {
            console.log(`[CRON] Found ${overduePasses.length} passes to expire.`);

            const idsToExpire = overduePasses.map(p => p.id);

            // Batch update status to 'expired'
            await db.query(`
                UPDATE requests 
                SET status = 'expired' 
                WHERE id IN (?)
            `, [idsToExpire]);

            // Notify Students
            for (const pass of overduePasses) {
                await sendNotification(
                    { userId: pass.user_id },
                    {
                        title: 'Pass Expired ⏳',
                        message: `Your pass (Ref #${pass.id}) has expired because you did not exit within ${bufferHours} hours of your scheduled departure time. Please apply for a new pass if you still wish to leave.`,
                        type: 'warning',
                        category: 'system'
                    }
                );
            }
        } else {
            // console.log('[CRON] No passes to expire.');
        }

    } catch (error) {
        console.error('[CRON] Error in Pass Expiration Service:', error);
    }
};

// Start the scheduler
const startExpirationService = () => {
    // Run immediately on startup
    runPassExpirationCheck();

    // specific interval (e.g., every 5 minutes)
    setInterval(runPassExpirationCheck, 5 * 60 * 1000);
};

module.exports = { startExpirationService };
