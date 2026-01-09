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

        // 1. Resolve Recipients (Fetch student_type for logic)
        if (userId) {
            const [user] = await db.query('SELECT id, phone, parent_phone, name, student_type FROM users WHERE id = ?', [userId]);
            if (user.length > 0) usersToNotify.push(user[0]);
        } else if (role) {
            let query = 'SELECT id, phone, parent_phone, name, student_type FROM users WHERE role = ?';
            let params = [role];
            if (departmentId) {
                query += ' AND department_id = ?';
                params.push(departmentId);
            }
            const [users] = await db.query(query, params);
            usersToNotify = users;
        }

        if (usersToNotify.length === 0) return { count: 0 };

        // 2. Persist to DB (In-App Notification)
        const userIds = usersToNotify.map(u => u.id);
        const values = userIds.map(uid => [uid, title, message, type, category, link, false]);

        if (values.length > 0) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type, category, link, is_read) VALUES ?',
                [values]
            );

            // 3. Dispatch Channels
            const whatsappService = require('../services/whatsappService');
            const smsService = require('../services/smsService');
            const { notifyUser } = require('../services/socketService');

            console.log(`[BROADCAST] Processing ${usersToNotify.length} users. Logic: Strict WhatsApp + Rejections + DayScholar Final.`);

            for (const user of usersToNotify) {
                // A. Socket (Real-time UI)
                notifyUser(user.id, 'notification', { title, message, type, category, link });
                notifyUser(user.id, 'request_updated', { type: 'notification' });

                // B. Browser Push (Always)
                try {
                    const pushService = require('../services/pushService');
                    pushService.sendPushNotification(user.id, {
                        title, body: message,
                        data: { url: link || '/notifications', type: category }
                    });
                } catch (e) { }

                // C. WhatsApp & SMS Logic
                // Policy: OTP, Emergency, Rejections, Final Approvals

                const lowerTitle = title.toLowerCase();
                const isOTP = category === 'otp';
                const isEmergency = lowerTitle.includes('emergency');
                const isRejection = type === 'error' || lowerTitle.includes('rejected') || lowerTitle.includes('declined');

                // Final Approval Definition:
                // 1. "Ready" / "Issued" (Standard used by Warden/Emergency)
                const isStandardFinal = lowerTitle.includes('ready') || lowerTitle.includes('pass issued');

                // 2. "HOD Approval" IS Final ONLY for Day Scholars
                // (Hostelers need Warden after HOD, so HOD is intermediate for them)
                const isDayScholarFinal = lowerTitle.includes('hod approval') && user.student_type === 'Day Scholar';

                const shouldSendWhatsApp = isOTP || isEmergency || isRejection || isStandardFinal || isDayScholarFinal;

                let whatsAppSent = false;

                if (user.phone && shouldSendWhatsApp) {
                    try {
                        let template = 'gatekeeper_update';
                        if (isOTP) template = 'otp_code';
                        if (isEmergency) template = 'emergency_alert';
                        if (isStandardFinal || isDayScholarFinal) template = 'gate_pass_ready';
                        if (isRejection) template = 'gate_pass_rejected'; // Hypothetical template

                        // Attempt generic WhatsApp message if template map is complex
                        // We use the robust sendWhatsApp which falls back to text usually
                        const icon = isRejection ? '❌' : (isOTP ? '🔐' : '✅');
                        const formattedMsg = `${icon} *UniVerse GateKeeper*\n\n*${title}*\n${message}`;

                        whatsAppSent = await whatsappService.sendWhatsApp(user.phone, formattedMsg);

                        if (whatsAppSent) console.log(`[WHATSAPP] Sent to ${user.id}`);
                    } catch (waErr) {
                        console.error(`[WHATSAPP] Failed for ${user.id}:`, waErr.message);
                        whatsAppSent = false;
                    }
                }

                // D. SMS Fallback
                // Triggered if WhatsApp logic WANTED to send but FAILED, or if user has no WA capability implied
                if (shouldSendWhatsApp && !whatsAppSent && user.phone) {
                    try {
                        console.log(`[SMS FALLBACK] Sending to ${user.id}`);
                        await smsService.sendSMS(user.phone, `${title}: ${message}`);
                    } catch (smsErr) {
                        console.error(`[SMS] Failed for ${user.id}:`, smsErr.message);
                    }
                }
            }
        }

        return { count: userIds.length };
    } catch (error) {
        console.error('Notification dispatch failed:', error);
        return { count: 0, error };
    }
};

exports.createNotification = async (userId, title, message, type = 'info', link = null, category = 'system') => {
    // Wrapper to match expected object signature
    return exports.sendNotification({ userId }, { title, message, type, link, category });
};

// API: Get current user's notifications
exports.getMyNotifications = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );

        // Auto-Cleanup Trigger: Delete read notifications older than 25 hours
        // User requested strict 25h deletion for all roles
        if (Math.random() < 0.2) { // Increased frequency to 20%
            db.query('DELETE FROM notifications WHERE is_read = TRUE AND read_at < DATE_SUB(NOW(), INTERVAL 25 HOUR)').catch(console.error);
        }

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
            'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        // --- Auto-Cleanup Trigger ---
        // Delete notifications read more than 25 hours ago
        db.query('DELETE FROM notifications WHERE is_read = TRUE AND read_at < DATE_SUB(NOW(), INTERVAL 25 HOUR)').catch(e => console.error('Cleanup Error:', e));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

// API: Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ?',
            [req.user.id]
        );

        // --- Auto-Cleanup Trigger ---
        db.query('DELETE FROM notifications WHERE is_read = TRUE AND read_at < DATE_SUB(NOW(), INTERVAL 25 HOUR)').catch(e => console.error('Cleanup Error:', e));

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
// API: Get VAPID Public Key for Frontend
exports.getVapidKey = (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return res.status(500).json({ message: 'VAPID key not configured' });
    }
    res.json({ publicKey });
};
