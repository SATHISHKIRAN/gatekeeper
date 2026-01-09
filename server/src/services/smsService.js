const axios = require('axios');

/**
 * SMS Service (Standard API)
 * Configured via Environment Variables.
 * Provider: Fast2SMS (Default) or compatible GET API.
 */

const SMS_PROVIDER_URL = process.env.SMS_PROVIDER_URL || 'https://www.fast2sms.com/dev/bulkV2';
const SMS_API_KEY = process.env.SMS_API_KEY;

/**
 * Send an SMS to a single number
 * @param {string} phone - 10 digit mobile number
 * @param {string} message - Message content
 */
exports.sendSMS = async (phone, message) => {
    try {
        if (!SMS_API_KEY || SMS_API_KEY.includes('YOUR_')) {
            console.warn('[SMS] Skipped: API Key not configured in .env');
            return false;
        }

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        console.log(`[SMS] Sending to ${cleanPhone}...`);

        const response = await axios.get(SMS_PROVIDER_URL, {
            params: {
                authorization: SMS_API_KEY,
                message: message,
                language: 'english',
                route: 'q', // Quick Transactional
                numbers: cleanPhone,
                flash: 0
            }
        });

        if (response.data && response.data.return === true) {
            console.log(`[SMS] Success: ${response.data.message}`);
            return true;
        } else {
            console.error('[SMS] Provider Error:', response.data);
            return false;
        }

    } catch (error) {
        console.error('[SMS] Network Failed:', error.message);
        return false;
    }
};

exports.sendOTP = async (phone, otp) => {
    const message = `GateKeeper Code: ${otp}`;
    return exports.sendSMS(phone, message);
};
