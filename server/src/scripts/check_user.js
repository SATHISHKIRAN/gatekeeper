const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'universe_gatekeeper',
};

async function checkUser() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, name, email, role, status FROM users WHERE email = ?', ['admin@gmail.com']);
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}

checkUser();
