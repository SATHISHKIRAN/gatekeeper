const db = require('../config/database');

/**
 * Deducts trust score points from a student.
 * @param {number} userId - The student's user ID.
 * @param {number} points - Points to deduct (positive integer, automatically converted to negative).
 * @param {string} reason - Reason for deduction.
 */
exports.deductTrustScore = async (userId, points, reason) => {
    try {
        if (points <= 0) return; // No penalty to apply

        const penalty = -Math.abs(points); // Ensure negative

        // 1. Get current score
        const [[user]] = await db.query('SELECT trust_score FROM users WHERE id = ?', [userId]);
        if (!user) return;

        let currentScore = user.trust_score || 100;
        let newScore = Math.max(0, currentScore + penalty); // Floor at 0

        // 2. Update User
        await db.query('UPDATE users SET trust_score = ? WHERE id = ?', [newScore, userId]);

        // 3. Log into History
        await db.query(
            'INSERT INTO trust_history (user_id, changed_by, old_score, new_score, reason) VALUES (?, ?, ?, ?, ?)',
            [userId, 1, currentScore, newScore, reason] // changed_by 1 (System Admin/Automated)
        );

        // 4. Notify Student
        const { createNotification } = require('../controllers/notificationController');
        await createNotification(
            userId,
            'Trust Score Alert 📉',
            `Your trust score has decreased by ${Math.abs(penalty)} points. Reason: ${reason}. New Score: ${newScore}/100.`,
            'error'
        );

        console.log(`[TRUST] Deducted ${Math.abs(penalty)} from User ${userId}. New Score: ${newScore}`);

    } catch (error) {
        console.error('[TRUST] Error deducting score:', error);
    }
};
