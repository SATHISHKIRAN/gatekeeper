const db = require('./src/config/database');

async function initDB() {
    try {
        console.log('Initializing Calendar Events Table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                type ENUM('holiday', 'exam', 'event') DEFAULT 'holiday',
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Calendar Events Table Created Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
}

initDB();
