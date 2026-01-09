const db = require('../src/config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugQuery() {
    const regNo = 'MEDTEST001';
    console.log(`🔍 Debugging Gate Query for: ${regNo}`);

    const query = `
            SELECT 
                r.id as request_id, r.type, r.status, r.category,
                u.student_type, u.register_number
            FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE (
                (u.student_type = 'day_scholar' AND r.status = 'approved_hod') 
                OR (u.student_type = 'hostel' AND r.status = 'approved_warden')
                OR (r.status = 'approved_hod' AND r.type = 'emergency')
                OR (r.status = 'active')
            )
            AND u.register_number = ?
    `;

    console.log('Query:', query.replace(/\s+/g, ' '));

    try {
        const [rows] = await db.query(query, [regNo]);
        console.log('--- Result Rows ---');
        console.log(JSON.stringify(rows, null, 2));

        // Also dumping ALL requests for this user to compare
        console.log('\n--- All Requests for User ---');
        const [allReq] = await db.query(`
            SELECT r.id, r.type, r.status, r.category, u.student_type 
            FROM requests r JOIN users u ON r.user_id=u.id 
            WHERE u.register_number = ?`, [regNo]);
        console.log(JSON.stringify(allReq, null, 2));

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

debugQuery();
