const db = require('./src/config/database');

async function listDepartments() {
    try {
        const [rows] = await db.query('SELECT * FROM departments');
        console.log('Departments:', rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listDepartments();
