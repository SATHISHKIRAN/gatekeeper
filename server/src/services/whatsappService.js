const axios = require('axios');

/**
 * WhatsAppService - Official Business Cloud API Implementation
 * This service replaces the legacy whatsapp-web.js implementation.
 * It uses Meta's official GraphQL/REST endpoints for high reliability.
 */
class WhatsAppService {
    constructor() {
        this.token = process.env.WHATSAPP_CLOUD_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.version = 'v18.0'; // Latest stable Meta API version
        this.apiUrl = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`;

        if (this.token && this.phoneNumberId) {
            console.log('[WHATSAPP] Official Cloud API initialized successfully.');
        } else {
            console.warn('[WHATSAPP] Official Credentials missing in .env! (WHATSAPP_CLOUD_TOKEN or WHATSAPP_PHONE_NUMBER_ID)');
        }
    }

    /**
     * Send a WhatsApp message to a phone number (Generic Text).
     * @param {string} phone - Phone number with country code (e.g., "919876543210").
     * @param {string} message - The message content.
     */
    async sendWhatsApp(phone, message) {
        try {
            if (!this.token || !this.phoneNumberId) {
                console.error('[WHATSAPP] Cannot send message: Credentials missing.');
                return false;
            }

            const cleanPhone = this._formatPhone(phone);

            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "text",
                text: {
                    preview_url: false,
                    body: message
                }
            };

            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) {
                console.log(`[WHATSAPP] Text Message sent to ${cleanPhone} (ID: ${response.data.messages[0].id})`);
                return true;
            }

            return false;
        } catch (error) {
            this._handleError(error);
            return false;
        }
    }

    /**
     * Send an official WhatsApp Template message.
     * This is required for proactive notifications to users who haven't messaged within 24h.
     * @param {string} phone - Recipient phone number.
     * @param {string} templateName - The name of the approved template in Meta Dashboard.
     * @param {Array<string>} bodyParams - List of strings for {{1}}, {{2}}, etc.
     */
    async sendTemplate(phone, templateName, bodyParams = []) {
        try {
            if (!this.token || !this.phoneNumberId) {
                console.error('[WHATSAPP] Cannot send template: Credentials missing.');
                return false;
            }

            const cleanPhone = this._formatPhone(phone);

            const parameters = bodyParams.map(param => ({
                type: "text",
                text: param
            }));

            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: "en_US" // Adjust if using multiple languages
                    },
                    components: [
                        {
                            type: "body",
                            parameters: parameters
                        }
                    ]
                }
            };

            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) {
                console.log(`[WHATSAPP] Template [${templateName}] sent to ${cleanPhone} (ID: ${response.data.messages[0].id})`);
                return true;
            }

            return false;
        } catch (error) {
            this._handleError(error);
            return false;
        }
    }

    /**
     * Helper to format phone number to E.164 without '+'
     */
    _formatPhone(phone) {
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10) {
            clean = '91' + clean; // Default to India if 10 digits
        }
        return clean;
    }

    /**
     * Helper to handle and log Meta API errors
     */
    _handleError(error) {
        console.error('[WHATSAPP] API Error:', error.response?.data || error.message);
        if (error.response?.data?.error) {
            const metaError = error.response.data.error;
            console.error(`[META DEBUG] Code: ${metaError.code} | Message: ${metaError.message} | Type: ${metaError.type}`);
        }
    }
}

// Export a singleton instance
module.exports = new WhatsAppService();
