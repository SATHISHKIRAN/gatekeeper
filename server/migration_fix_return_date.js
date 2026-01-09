const db = require('./src/config/database');

async function runMigration() {
    try {
        console.log('Migrating requests table: modifying return_date to be NULLABLE...');
        await db.query("ALTER TABLE requests MODIFY COLUMN return_date DATETIME NULL DEFAULT NULL;");
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
