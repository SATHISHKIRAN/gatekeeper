const db = require('../server/src/config/database');

async function fixProxy() {
    try {
        console.log('--- Force Activating Proxy for HOD 442 / Proxy 443 ---');

        // 1. Activate Proxy Setting ID 7 (Latest for HOD 442)
        const [res1] = await db.query('UPDATE proxy_settings SET is_active = TRUE WHERE id = 7');
        console.log('Proxy Settings Update:', res1.info);

        // 2. Activate User Flag for Proxy 443
        const [res2] = await db.query('UPDATE users SET is_proxy_active = TRUE WHERE id = 443');
        console.log('User Flag Update:', res2.info);

        console.log('✅ Forced activation complete. Please refresh the dashboard.');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

fixProxy();
