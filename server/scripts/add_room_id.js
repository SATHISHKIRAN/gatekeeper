const db = require('../src/config/database');

async function addRoomIdColumn() {
    try {
        console.log('Checking for room_id column in users table...');

        // Check if column exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'universe_gatekeeper' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'room_id'
        `);

        if (columns.length > 0) {
            console.log('room_id column already exists in users table.');
        } else {
            console.log('Adding room_id column to users table...');
            await db.query(`
                ALTER TABLE users 
                ADD COLUMN room_id INT DEFAULT NULL,
                ADD CONSTRAINT fk_users_room 
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
            `);
            console.log('Successfully added room_id column and foreign key constraint.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating database:', error);
        process.exit(1);
    }
}

addRoomIdColumn();
