const db = require('../config/database');
const pushService = require('../services/pushService');

// Internal Helper to create notification(s)
// recipients: { userId?: number, role?: string, departmentId?: number }
// options: { title, message, type, link?, category? }
exports.sendNotification = async (recipients, options) => {
    try {
        let usersToNotify = [];
        const { userId, role, departmentId } = recipients;
        const { title, message, type = 'info', link = null, category = 'system' } = options;

        if (userId) {
            const [user] = await db.query('SELECT id, phone, parent_phone FROM users WHERE id = ?', [userId]);
            if (user.length > 0) usersToNotify.push(user[0]);
        } else if (role) {
            let query = 'SELECT id, phone, parent_phone FROM users WHERE role = ?';
            let params = [role];

            if (departmentId) {
                query += ' AND department_id = ?';
                params.push(departmentId);
            }
            const [users] = await db.query(query, params);
            usersToNotify = users;
        }

        if (usersToNotify.length === 0) return { count: 0 };

        const userIds = usersToNotify.map(u => u.id);

        // Bulk insert
        const values = userIds.map(uid => [uid, title, message, type, category, link, false]);
        if (values.length > 0) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type, category, link, is_read) VALUES ?',
                [values]
            );

            // Dispatch Multi-Channel Notifications
            const whatsappService = require('../services/whatsappService');
            usersToNotify.forEach(user => {
                // 1. Browser Push
                pushService.sendPushNotification(user.id, {
                    title: title,
                    body: message,
                    data: { url: link || '/notifications' }
                });

                // 2. WhatsApp Notification
                if (user.phone) {
                    whatsappService.sendWhatsApp(user.phone, `*${title}*\n\n${message}`);
                }

                // 3. Parental Notification (if applicable)
                if ((category === 'request' || category === 'security') && user.parent_phone) {
                    whatsappService.sendWhatsApp(user.parent_phone, `*Alert for Ward*\n\n${title}: ${message}`);
                }
            });
        }

        return { count: userIds.length, userIds };
    } catch (error) {
        console.error('Notification dispatch failed:', error);
        return { count: 0, error };
    }
};

// Alias for consistency with other controllers that might import 'createNotification'
exports.createNotification = async (userId, title, message, type = 'info', link = null, category = 'system') => {
    return exports.sendNotification({ userId }, { title, message, type, link, category });
};

// API: Get current user's notifications
exports.getMyNotifications = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );

        const [[{ unread_count }]] = await db.query(
            'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [req.user.id]
        );

        res.json({ notifications: rows, unreadCount: unread_count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

// API: Mark specific notification as read
exports.markAsRead = async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

// API: Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

// API: Admin Manual Broadcast
exports.broadcast = async (req, res) => {
    try {
        const { role, department_id, title, message, type, link, category = 'system' } = req.body;
        const result = await exports.sendNotification(
            { role, departmentId: department_id },
            { title, message, type, link, category }
        );
        res.json({ message: `Sent to ${result.count} users` });
    } catch (error) {
        res.status(500).json({ message: 'Broadcast failed' });
    }
};

// API: Register Push Subscription
exports.subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription) return res.status(400).json({ message: 'Subscription required' });

        await pushService.saveSubscription(req.user.id, subscription);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Subscription failed' });
    }
};
