const mysql = require('mysql2/promise');
require('dotenv').config();

async function listUsers() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await db.execute('SELECT * FROM notifications WHERE user_id = 47 ORDER BY created_at DESC LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

listUsers();
