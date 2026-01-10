const webpush = require('web-push');
const db = require('../config/database');

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
    console.warn('VAPID keys not found in environment. Push notifications disabled.');
} else {
    webpush.setVapidDetails(
        'mailto:support@gatepass.com',
        publicVapidKey,
        privateVapidKey
    );
}

/**
 * Send a push notification to all subscriptions of a user.
 * @param {number} userId - The ID of the recipient user.
 * @param {object} payload - The notification data (title, body, icon, url).
 */
exports.sendPushNotification = async (userId, payload) => {
    try {
        const [subscriptions] = await db.query(
            'SELECT subscription FROM push_subscriptions WHERE user_id = ?',
            [userId]
        );

        if (!subscriptions || subscriptions.length === 0) {
            return;
        }

        const notificationPayload = JSON.stringify(payload);

        const pushPromises = subscriptions.map(subRecord => {
            const subscription = typeof subRecord.subscription === 'string'
                ? JSON.parse(subRecord.subscription)
                : subRecord.subscription;

            return webpush.sendNotification(subscription, notificationPayload)
                .catch(err => {
                    // 410 = Gone, 404 = Not Found, 401 = Invalid Signature (Key mismatch)
                    if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 401) {
                        console.log(`Push subscription invalid (${err.statusCode}), removing...`);
                        return db.query('DELETE FROM push_subscriptions WHERE subscription = ?', [JSON.stringify(subscription)]);
                    }
                    console.error('Push notification failed:', err);
                });
        });

        await Promise.all(pushPromises);
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};

/**
 * Save or update a push subscription for a user.
 */
exports.saveSubscription = async (userId, subscription) => {
    try {
        const subStr = JSON.stringify(subscription);
        // Check if subscription already exists for this user to avoid duplicates
        const [existing] = await db.query(
            'SELECT id FROM push_subscriptions WHERE user_id = ? AND CAST(subscription AS CHAR) = ?',
            [userId, subStr]
        );

        if (existing.length === 0) {
            await db.query(
                'INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)',
                [userId, subStr]
            );
        }
        return true;
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return false;
    }
};
