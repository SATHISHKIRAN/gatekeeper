const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'universe_gatekeeper'
};

async function resetPassword() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await connection.query(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, 'admin@universe.com']
        );

        if (result.affectedRows > 0) {
            console.log('Password updated successfully for admin@universe.com');
        } else {
            console.log('User not found');
        }

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

resetPassword();
