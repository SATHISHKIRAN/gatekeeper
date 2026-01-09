const db = require('./src/config/database');

async function checkSchema() {
    try {
        const [columns] = await db.query('SHOW COLUMNS FROM requests');
        console.log('Columns in requests table:', columns.map(c => c.Field));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
