const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppService {
    constructor() {
        console.log('[WHATSAPP] Initializing WhatsApp Client...');
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './.wwebjs_auth'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
                ]
            }
        });

        this.isReady = false;
        this.initialize();
    }

    initialize() {
        this.client.on('qr', (qr) => {
            console.log('\n=========================================');
            console.log('[WHATSAPP] NEW QR CODE RECEIVED!');
            console.log('[WHATSAPP] If you cannot see the QR below, open this link:');
            console.log(`https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(qr)}`);
            console.log('-----------------------------------------');
            qrcode.generate(qr, { small: true });
            console.log('=========================================\n');
        });

        this.client.on('loading_screen', (percent, message) => {
            console.log(`[WHATSAPP] Loading: ${percent}% - ${message}`);
        });

        this.client.on('ready', () => {
            console.log('[WHATSAPP] !!! Client is ready and authenticated !!!');
            this.isReady = true;
        });

        this.client.on('authenticated', () => {
            console.log('[WHATSAPP] Authenticated successfully!');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('[WHATSAPP] Authentication failure:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WHATSAPP] Client was logged out:', reason);
            this.isReady = false;
        });

        this.client.initialize().catch(err => {
            console.error('[WHATSAPP] Initialization error:', err);
        });
    }

    /**
     * Send a WhatsApp message to a phone number.
     * @param {string} phone - Phone number with country code (e.g., "919876543210").
     * @param {string} message - The message content.
     */
    async sendWhatsApp(phone, message) {
        try {
            if (!this.isReady) {
                console.warn('[WHATSAPP] Client not ready. Message queued or skipped.');
                return false;
            }

            // Clean phone number: remove non-digits
            let cleanPhone = phone.replace(/\D/g, '');

            // Auto-fix for common 10-digit numbers (assume India/91 if 10 digits)
            if (cleanPhone.length === 10) {
                cleanPhone = '91' + cleanPhone;
            }

            const chatId = `${cleanPhone}@c.us`;

            await this.client.sendMessage(chatId, message);
            console.log(`[WHATSAPP] Message sent to ${cleanPhone}`);
            return true;
        } catch (error) {
            console.error('[WHATSAPP] Error sending message:', error);
            return false;
        }
    }
}

// Export a singleton instance
module.exports = new WhatsAppService();
