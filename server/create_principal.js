const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'universe_gatekeeper',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function createPrincipal() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const email = 'principal@gate.edu';
        const password = 'Principal@123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if exists
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            console.log('Principal user already exists.');
            // Update to ensure role is correct
            await connection.execute('UPDATE users SET role = "principal", password_hash = ? WHERE email = ?', [hashedPassword, email]);
            console.log('Updated existing user to Principal role.');
        } else {
            const [result] = await connection.execute(
                'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
                ['Dr. Principal', email, hashedPassword, 'principal', 'active']
            );
            console.log('Principal user created with ID:', result.insertId);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createPrincipal();
