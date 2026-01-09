const db = require('../server/src/config/database');

async function debugProxy() {
    try {
        console.log('--- Debugging Proxy Settings ---');
        const [rows] = await db.query('SELECT * FROM proxy_settings');
        console.log('All Proxy Settings:', JSON.stringify(rows, null, 2));

        const [active] = await db.query('SELECT * FROM proxy_settings WHERE is_active = TRUE AND CURDATE() BETWEEN start_date AND end_date');
        console.log('Active Proxies (SQL Check):', JSON.stringify(active, null, 2));

        console.log('Current Date (DB):');
        const [dateRow] = await db.query('SELECT CURDATE() as curdate, NOW() as now');
        console.log(dateRow[0]);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

debugProxy();
