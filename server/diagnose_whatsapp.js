const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('[DIAGNOSE] Starting WhatsApp diagnostic (SIMPLIFIED)...');

const client = new Client({
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n[DIAGNOSE] !!! QR EVENT RECEIVED !!!');
    console.log('[DIAGNOSE] QR string length:', qr.length);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('[DIAGNOSE] READY');
    process.exit(0);
});

client.on('error', (err) => {
    console.error('[DIAGNOSE] CLIENT ERROR:', err);
});

console.log('[DIAGNOSE] Initializing client (this may take up to 2 minutes on first run)...');
client.initialize().then(() => {
    console.log('[DIAGNOSE] Initialize Promise Resolved');
}).catch(err => {
    console.error('[DIAGNOSE] CATCH INITIALIZE ERROR:', err);
});

setTimeout(() => {
    console.log('[DIAGNOSE] 2 minute timeout reached. Force exiting.');
    process.exit(1);
}, 120000);
