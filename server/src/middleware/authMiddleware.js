const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // --- GLOBAL MAINTENANCE CHECK FOR ACTIVE SESSIONS ---
        // Skip for admin to prevent lockout
        if (decoded.role !== 'admin') {
            const [settings] = await db.query('SELECT maintenance_mode FROM settings WHERE id = 1');
            if (settings.length > 0 && settings[0].maintenance_mode) {
                return res.status(503).json({
                    message: 'Emergency Maintenance Mode Active. Session Suspended.'
                });
            }
        }

        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid token.' });
    }
};

exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};
