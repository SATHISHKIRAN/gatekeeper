const db = require('./src/config/database');

async function addProfileImage() {
    try {
        console.log('Adding profile_image column to users table...');
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER email;
        `);
        console.log('Column details_image added successfully (or check if it failed silently/already exists).');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column profile_image already exists.');
        } else {
            console.error('Error adding column:', error);
        }
        process.exit(1);
    }
}

addProfileImage();
