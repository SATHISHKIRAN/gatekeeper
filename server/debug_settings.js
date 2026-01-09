const db = require('./src/config/database');

async function fixSettings() {
    try {
        console.log('Checking settings table...');
        try {
            const [rows] = await db.query('SELECT * FROM settings');
            console.log('Settings table exists. Rows:', rows.length);
            if (rows.length === 0) {
                console.log('Inserting default settings...');
                await db.query(`
                    INSERT INTO settings (id, app_name, theme_primary) 
                    VALUES (1, 'UniVerse GateKeeper', '#4F46E5')
                `);
                console.log('Default settings inserted.');
            }
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('Settings table missing. Creating...');
                await db.query(`
                    CREATE TABLE IF NOT EXISTS settings (
                        id INT PRIMARY KEY DEFAULT 1,
                        app_name VARCHAR(255) DEFAULT 'UniVerse GateKeeper',
                        app_description TEXT,
                        app_logo VARCHAR(255) DEFAULT '/logo.png',
                        theme_primary VARCHAR(50) DEFAULT '#4F46E5',
                        theme_secondary VARCHAR(50) DEFAULT '#10B981',
                        maintenance_mode BOOLEAN DEFAULT FALSE,
                        allow_registration BOOLEAN DEFAULT TRUE,
                        low_cost_mode BOOLEAN DEFAULT FALSE,
                        announcement_text TEXT,
                        contact_email VARCHAR(255),
                        contact_phone VARCHAR(20),
                        session_timeout INT DEFAULT 60,
                        max_trust_score INT DEFAULT 100,
                        min_trust_score INT DEFAULT 0,
                        login_background MEDIUMTEXT
                    )
                `);
                console.log('Table created.');
                await db.query(`
                    INSERT INTO settings (id, app_name, theme_primary) 
                    VALUES (1, 'UniVerse GateKeeper', '#4F46E5')
                `);
                console.log('Default row inserted.');
            } else {
                throw err;
            }
        }
        console.log('Settings fix complete.');
        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

fixSettings();
