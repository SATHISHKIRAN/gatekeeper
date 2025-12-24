const db = require('./src/config/database');

async function forceCleanup() {
    try {
        console.log('Force Cleaning Test Data...');

        // Emails used in test
        const emails = ['test.mentor@gate.com', 'test.student@gate.com', 'test.gate@gate.com'];

        for (const email of emails) {
            // Get user ID
            const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (users.length > 0) {
                const uid = users[0].id;
                console.log(`Found ${email} (ID: ${uid}). Cleaning up...`);

                // Delete related data
                await db.query('DELETE FROM notifications WHERE user_id = ?', [uid]);

                // Delete requests and logs (if student)
                const [requests] = await db.query('SELECT id FROM requests WHERE user_id = ?', [uid]);
                for (const r of requests) {
                    await db.query('DELETE FROM logs WHERE request_id = ?', [r.id]);
                }
                await db.query('DELETE FROM requests WHERE user_id = ?', [uid]);

                // Finally Delete User
                await db.query('DELETE FROM users WHERE id = ?', [uid]);
                console.log(`Deleted ${email}`);
            }
        }

        console.log('Cleanup Complete.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup Failed:', error);
        process.exit(1);
    }
}

forceCleanup();
