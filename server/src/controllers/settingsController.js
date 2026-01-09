const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.getSettings = async (req, res) => {
    try {
        console.log('[SETTINGS] Fetching settings...');
        const [rows] = await db.query('SELECT * FROM settings WHERE id = 1');

        if (!rows || rows.length === 0) {
            console.log('[SETTINGS] No settings found, returning defaults');
            return res.json({
                app_name: 'UniVerse',
                theme_primary: '#4F46E5',
                app_logo: '',
                login_background: ''
            });
        }

        // Remove sensitive data
        const settings = rows[0];
        delete settings.admin_password_hash;

        res.json(settings);
    } catch (error) {
        console.error('[SETTINGS ERROR] Get:', error);
        res.status(500).json({
            message: 'Error fetching settings',
            error: error.message
        });
    }
};

exports.verifyAdminPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const [rows] = await db.query('SELECT admin_password_hash FROM settings WHERE id = 1');

        if (!rows || rows.length === 0) {
            return res.json({ success: false, message: 'Settings not found' });
        }

        const storedHash = rows[0].admin_password_hash;

        // If no password set yet, any password (or maybe a default) works? 
        // Let's enforce a default "admin123" if null
        if (!storedHash) {
            // For safety, if not set, let's treat "admin123" as specific default or allow entry to set it?
            // Simplest: Check against "admin123" if null, OR allow first time setup.
            // Let's assume user enters "admin123" for first time.
            if (password === 'admin123') return res.json({ success: true });
            return res.json({ success: false, message: 'Invalid Security PIN' });
        }

        const match = await bcrypt.compare(password, storedHash);
        if (match) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Invalid Security PIN' });
        }
    } catch (error) {
        console.error('Verify PIN Error:', error);
        res.status(500).json({ success: false, message: 'Server error verifying PIN' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const {
            app_name, app_description, app_logo, theme_primary, theme_secondary,
            maintenance_mode, allow_registration, announcement_text,
            contact_email, contact_phone, session_timeout,
            max_trust_score, min_trust_score, login_background,
            // New password field (optional)
            new_admin_password
        } = req.body;

        let passwordQuery = "";
        let queryParams = [
            app_name, app_description, app_logo, theme_primary, theme_secondary,
            maintenance_mode, allow_registration, announcement_text,
            contact_email, contact_phone, session_timeout,
            max_trust_score, min_trust_score, login_background
        ];

        if (new_admin_password) {
            const hashedPassword = await bcrypt.hash(new_admin_password, 10);
            passwordQuery = ", admin_password_hash = ?";
            queryParams.push(hashedPassword);
        }

        await db.query(`
            UPDATE settings 
            SET app_name = ?, app_description = ?, app_logo = ?, 
                theme_primary = ?, theme_secondary = ?,
                maintenance_mode = ?, allow_registration = ?,
                announcement_text = ?, contact_email = ?, contact_phone = ?,
                session_timeout = ?, max_trust_score = ?, min_trust_score = ?,
                login_background = ?${passwordQuery}
            WHERE id = 1
        `, queryParams);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('[SETTINGS ERROR] Update:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
};
