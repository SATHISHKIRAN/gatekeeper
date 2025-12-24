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
