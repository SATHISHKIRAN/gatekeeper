const crypto = require('crypto');

// Use a consistent secret key (in production, use env vars)
// For this demo, we use a fixed key derived from a string to ensure persistence across restarts
const SECRET_KEY = crypto.createHash('sha256').update('universe_gatekeeper_secret_2024').digest();
const ALGORITHM = 'aes-256-cbc';

exports.generateSecureOriginal = () => {
    // Generate a secure random 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    return code;
};

exports.encryptQRProxy = (data) => {
    // Data is a JSON object
    const text = JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Return format: iv:encrypted
    return iv.toString('hex') + ':' + encrypted;
};

exports.decryptQRProxy = (encryptedData) => {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) throw new Error('Invalid format');

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];

        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (err) {
        console.error("Decryption failed:", err);
        return null; // Invalid token
    }
};
