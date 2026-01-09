const db = require('./src/config/database');

const runMigration = async () => {
    try {
        console.log('Checking if profile_image column exists...');
        const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'profile_image'");

        if (columns.length === 0) {
            console.log('Column not found. Adding profile_image column...');
            await db.query("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER phone");
            console.log('SUCCESS: profile_image column added.');
        } else {
            console.log('INFO: profile_image column already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
};

runMigration();
