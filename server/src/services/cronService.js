const db = require('../config/database');
const { sendNotification } = require('../controllers/notificationController');

exports.initScheduledJobs = () => {
    console.log('[CRON] Initializing Scheduled Jobs...');

    // Run immediately on start
    runExpiryCheck();

    // Then run every 30 minutes (30 * 60 * 1000)
    setInterval(runExpiryCheck, 30 * 60 * 1000);
};

const runExpiryCheck = async () => {
    try {
        console.log(`[CRON] Running Expiry Check at ${new Date().toISOString()}...`);

        // Find passes that are:
        // 1. PAST their Return Date
        // 2. Status is NOT final (completed, rejected, cancelled, expired)
        //    (i.e., status IS pending, approved_staff, approved_hod, approved_warden, active, generated)

        // Wait, if status is 'active' (Gate Exit), and return date passed -> That's OVERDUE (Student is out).
        // We shouldn't mark 'active' passes as 'expired'. 'Expired' usually means "Not used in time".
        // If they are OUT, they are 'overdue', not 'expired'.

        // So we target only: pending, approved_staff, approved_hod, approved_warden.
        // If they haven't exited by the RETURN DATE (or maybe Departure Date + Buffer?), they are invalid.
        // User said: "miss to aprove the pass within the Return date".
        // So strictly targeting passes that haven't even started (or finished approval) by the time they were supposed to come back.

        const targetStatuses = ['pending', 'approved_staff', 'approved_hod', 'approved_warden'];

        // We also need to fetch them to notify users? 
        // For efficiency, let's just update and see affected rows? 
        // But better to notify.

        const [overdueRequests] = await db.query(`
            SELECT id, user_id, type, status, return_date 
            FROM requests 
            WHERE status IN ('pending', 'approved_staff', 'approved_hod', 'approved_warden')
            AND return_date < NOW()
        `);

        if (overdueRequests.length === 0) {
            console.log('[CRON] No expired passes found.');
            return;
        }

        console.log(`[CRON] Found ${overdueRequests.length} passes to expire.`);

        const idsToExpire = overdueRequests.map(r => r.id);

        await db.query(`
            UPDATE requests 
            SET status = 'expired'
            WHERE id IN (?)
        `, [idsToExpire]);

        // Optional: Notify users
        // Group by user to avoid spam? Loop is fine for reasonable numbers.
        for (const req of overdueRequests) {
            await sendNotification(
                { userId: req.user_id },
                {
                    title: 'Pass Expired',
                    message: `Your ${req.type} pass request #${req.id} has expired because the validity period has ended.`,
                    type: 'error',
                    category: 'system',
                    entityId: req.id
                }
            );
        }

        console.log(`[CRON] Successfully expired ${idsToExpire.length} passes.`);

    } catch (error) {
        console.error('[CRON] Expiry Check Failed:', error);
    }
};
