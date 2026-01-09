const db = require('../config/database');

async function val() {
    try {
        console.log('Testing DB logic...');
        // Assume user ID is obtained correctly.
        // IT4004 -> std4_it_yr4@gmail.com
        const [users] = await db.query('SELECT id, name FROM users WHERE register_number = "IT4004"');
        if (users.length === 0) { console.log('User not found'); return; }
        const userId = users[0].id;
        console.log('User ID:', userId);

        console.log('--- DB CONFIG ---');
        console.log('DB Name:', process.env.DB_NAME);

        console.log('--- SCHEMA ---');
        const [schema] = await db.query('DESCRIBE requests');
        const statusCol = schema.find(c => c.Field === 'status');
        console.log('Status Column Type:', statusCol ? statusCol.Type : 'NOT FOUND');

        console.log('--- NO LIMIT ---');
        const [allReqs] = await db.query('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        if (allReqs.length) console.log('Status (No Limit):', `"${allReqs[0].status}"`);

        console.log('--- WITH LIMIT ---');
        const limit = 10;
        const offset = 0;
        const [requests] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, parseInt(limit), offset]
        );

        console.log('Requests found:', requests.length);
        if (requests.length > 0) {
            console.log('First Request Status:', `"${requests[0].status}"`);
            console.log('Raw:', requests[0]);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

val();
