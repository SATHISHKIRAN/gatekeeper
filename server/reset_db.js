const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to MySQL server...');

        const dbName = process.env.DB_NAME || 'universe_gatekeeper';

        console.log(`Dropping and recreating database: ${dbName}...`);
        await connection.query(`DROP DATABASE IF EXISTS ${dbName};`);
        await connection.query(`CREATE DATABASE ${dbName};`);
        await connection.query(`USE ${dbName};`);

        console.log('Applying fresh schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);

        console.log('Seeding fresh demo data...');
        const password = await bcrypt.hash('password123', 10);
        const seedSql = `
            INSERT INTO users (name, email, password_hash, role, trust_score) VALUES
            ('Admin User', 'admin@universe.com', '${password}', 'admin', 100),
            ('John Student', 'student@universe.com', '${password}', 'student', 95),
            ('Jane Staff', 'staff@universe.com', '${password}', 'staff', 100),
            ('Dr. HOD', 'hod@universe.com', '${password}', 'hod', 100),
            ('Mr. Warden', 'warden@universe.com', '${password}', 'warden', 100),
            ('Gatekeeper Bob', 'gate@universe.com', '${password}', 'gatekeeper', 100);
        `;

        await connection.query(seedSql);
        console.log('Database reset and seeded successfully! 🚀');
        console.log('Use email: admin@universe.com | password: password123');

        await connection.end();
    } catch (error) {
        console.error('Reset failed:', error);
        process.exit(1);
    }
}

resetDatabase();
