const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');

exports.login = async (req, res) => {
    // Trim inputs to avoid whitespace issues
    const email = req.body.email ? req.body.email.trim() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const dbPassword = user.password_hash || user.password;

        if (!dbPassword) {
            return res.status(500).json({ message: 'User record is missing authentication data' });
        }

        const isMatch = await bcrypt.compare(password, dbPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, department_id: user.department_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department_id: user.department_id,
                trust_score: user.trust_score,
                student_type: user.student_type,
                register_number: user.register_number,
                year: user.year,
                phone: user.phone
            }
        });
    } catch (error) {
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(__dirname, '../../debug_login_500.log');
            fs.appendFileSync(logPath, `${new Date().toISOString()} LOGIN ERROR: ${error.stack || error}\n`);
        } catch (e) { console.error('Logging failed', e); }

        console.error(error);
        if (error.code === 'ECONNREFUSED' || error.errno === 1045) {
            return res.status(503).json({ message: 'Database Connection Failed. Please ensure MySQL is running.' });
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (!req.user) {
            // Should be caught by verifyToken, but double check
            return res.status(401).json({ message: 'Not authenticated' });
        }
        res.json({ user: req.user });
    } catch (error) {
        console.error('getMe Error:', error);
        res.status(500).json({ message: 'Error fetching user session: ' + error.message });
    }
};

exports.forgotPasswordInit = async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT phone FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Email not found' });
        }
        const phone = users[0].phone;
        if (!phone) {
            return res.status(400).json({ message: 'No phone number associated with this account' });
        }
        // Mask phone: first and last digit shown (e.g. 9********1)
        const masked = phone[0] + '*'.repeat(phone.length - 2) + phone[phone.length - 1];
        res.json({ maskedPhone: masked });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.sendResetOTP = async (req, res) => {
    const { email, phone } = req.body;
    try {
        const [users] = await db.query('SELECT id, phone FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        // Normalize phone for comparison
        const cleanInputPhone = phone.replace(/\D/g, '');
        const cleanDBPhone = user.phone ? user.phone.replace(/\D/g, '') : '';

        // Match only last digits if input is shorter, but user said "enter the mobile number 10 digit"
        // So we strictly clean and compare.
        if (cleanInputPhone !== cleanDBPhone) {
            return res.status(400).json({ message: 'Phone number does not match record' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.query('UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE id = ?', [otp, expiry, user.id]);

        const whatsappService = require('../services/whatsappService');
        await whatsappService.sendWhatsApp(user.phone, `Your UniVerse GateKeeper Password Reset OTP is: *${otp}*. Valid for 10 minutes.`);

        res.json({ message: 'OTP sent successfully to your WhatsApp number' });
    } catch (error) {
        console.error('OTP Send Error:', error);
        res.status(500).json({ message: 'Failed to send OTP: ' + error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()', [email, otp]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        res.json({ success: true, message: 'OTP verified' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()', [email, otp]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Session expired or invalid. Please restart the process.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = ?, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = ?', [hash, users[0].id]);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.forgotEmailInit = async (req, res) => {
    const { phone } = req.body;
    try {
        const cleanPhone = phone.replace(/\D/g, '');
        const [users] = await db.query('SELECT id, phone FROM users WHERE REPLACE(phone, " ", "") LIKE ?', [`%${cleanPhone}`]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Phone number not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update all users with this phone (to handle siblings/family)
        const userIds = users.map(u => u.id);
        await db.query('UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE id IN (?)', [otp, expiry, userIds]);

        const whatsappService = require('../services/whatsappService');
        await whatsappService.sendWhatsApp(users[0].phone, `Your UniVerse GateKeeper Email Recovery OTP is: *${otp}*. Valid for 10 minutes.`);

        res.json({ success: true, message: 'OTP sent to your WhatsApp number' });
    } catch (error) {
        console.error('Forgot Email Init Error:', error);
        res.status(500).json({ message: 'Failed to send OTP: ' + error.message });
    }
};

exports.verifyForgotEmailOTP = async (req, res) => {
    const { phone, otp } = req.body;
    try {
        const cleanPhone = phone.replace(/\D/g, '');
        // Find users with matching phone and valid OTP
        const [users] = await db.query(
            'SELECT email FROM users WHERE REPLACE(phone, " ", "") LIKE ? AND reset_otp = ? AND reset_otp_expiry > NOW()',
            [`%${cleanPhone}`, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const emails = users.map(u => u.email);

        // Clear OTP after success
        await db.query('UPDATE users SET reset_otp = NULL, reset_otp_expiry = NULL WHERE REPLACE(phone, " ", "") LIKE ?', [`%${cleanPhone}`]);

        res.json({ success: true, emails });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
