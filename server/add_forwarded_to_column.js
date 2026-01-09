const db = require('./src/config/database');

async function migrate() {
    try {
        console.log('Adding forwarded_to column to requests table...');
        await db.query('ALTER TABLE requests ADD COLUMN forwarded_to INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL');
        console.log('Column added successfully.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
            process.exit(0);
        }
        console.error('Error:', error);
        process.exit(1);
    }
}

migrate();
