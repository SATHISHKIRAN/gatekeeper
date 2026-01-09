const db = require('../config/database');

const addPinColumn = async () => {
    try {
        console.log('Checking for admin_password_hash column...');

        // check if column exists
        const [columns] = await db.query("SHOW COLUMNS FROM settings LIKE 'admin_password_hash'");

        if (columns.length === 0) {
            console.log('Column not found. Adding admin_password_hash...');
            await db.query("ALTER TABLE settings ADD COLUMN admin_password_hash VARCHAR(255) DEFAULT NULL");
            console.log('Column added successfully.');
        } else {
            console.log('Column admin_password_hash already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding column:', error);
        process.exit(1);
    }
};

addPinColumn();
