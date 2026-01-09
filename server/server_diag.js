const mysql = require('mysql2');
require('dotenv').config({ path: './src/.env' }) || require('dotenv').config();

console.log('--- DIAGNOSTIC START ---');

// 1. Test BCrypt load
try {
    console.log('Testing bcrypt load...');
    const bcrypt = require('bcrypt');
    console.log('bcrypt loaded successfully');
} catch (e) {
    console.error('FAILED to load bcrypt:', e.message);
}

// 2. Test DB Connection and Column
async function checkDB() {
    console.log('Testing DB Connection...');
    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'universe_gatekeeper'
    });

    connection.connect(async err => {
        if (err) {
            console.error('DB Connection FAILED:', err.message);
            return;
        }
        console.log('DB Connection SUCCESS');

        // Check Column
        try {
            connection.query("SHOW COLUMNS FROM settings LIKE 'admin_password_hash'", (err, results) => {
                if (err) {
                    console.error('Query Failed:', err.message);
                } else {
                    console.log('Column Check Result:', results);
                    if (results.length === 0) {
                        console.log('CRITICAL: admin_password_hash column is MISSING!');
                        // Try to add it
                        connection.query("ALTER TABLE settings ADD COLUMN admin_password_hash VARCHAR(255) DEFAULT NULL;", (err) => {
                            if (err) console.error("Failed to add column:", err.message);
                            else console.log("Automatically added missing column!");
                        });
                    } else {
                        console.log('Column admin_password_hash exists.');
                    }
                }
                connection.end();
            });
        } catch (e) {
            console.error(e);
        }
    });
}

checkDB();
