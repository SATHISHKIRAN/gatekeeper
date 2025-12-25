const db = require('../config/database');
const crypto = require('crypto');
const { deductTrustScore } = require('../utils/trustUtils');

// Helper to generate unique QR string
const generateQRHash = (userId, requestId) => {
    return crypto.createHash('sha256').update(`${userId}-${requestId}-${Date.now()}`).digest('hex');
};

const { sendNotification } = require('./notificationController');

exports.createRequest = async (req, res) => {
    const { type, reason, departure_date, return_date } = req.body;
    const userId = req.user.id;

    if (!type || !departure_date || !return_date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // --- EXCESSIVE REQUEST CHECK ---
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [requestCount] = await db.query(
            'SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND created_at >= ?',
            [userId, startOfMonth]
        );

        const count = requestCount[0].count;
        // If this is the 6th request or more (count is existing, so if count >= 5, new one is 6th)
        if (count >= 5) {
            // Penalty: 5 points per extra request
            await deductTrustScore(userId, 5, `Excessive Requests: Request #${count + 1} this month`);
        }

        // 0. Advanced Restriction Check
        const [[user]] = await db.query('SELECT pass_blocked, department_id, year, student_type, mentor_id, name FROM users WHERE id = ?', [userId]);

        if (user.pass_blocked) {
            return res.status(403).json({
                message: 'INDIVIDUAL_BLOCK: Your pass application privileges have been suspended by the HOD.',
                severity: 'high'
            });
        }

        // Upgraded Logic for Day Scholar vs Hostel Student

        let requires_qr = true;
        let category = 'Outing';

        if (user.student_type === 'day_scholar') {
            const allowedTypes = ['Leave', 'On Duty', 'Emergency'];
            if (!allowedTypes.includes(type)) {
                return res.status(400).json({ message: 'Invalid pass type for Day Scholars.' });
            }

            if (type === 'Emergency') {
                requires_qr = true;
                category = 'Emergency';
            } else {
                // Leave & On Duty for Day Scholars do not need QR (assumed pre-approval/attendance adjustment)
                requires_qr = false;
                category = type === 'On Duty' ? 'Academic' : 'Personal';
            }

        } else {
            // Hostel student logic
            // Hostel Stay Leave & On Duty = Internal/No QR
            if (['Leave', 'On Duty'].includes(type)) {
                requires_qr = false;
                category = type === 'On Duty' ? 'Academic' : 'Internal';
            }
            // External Passes = QR Required
            else if (['Outing', 'Home Visit', 'Project Work', 'Emergency', 'Vacation'].includes(type)) {
                requires_qr = true;
                if (type === 'Home Visit' || type === 'Vacation') category = 'Travel';
                else if (type === 'Project Work') category = 'Academic';
                else if (type === 'Emergency') category = 'Emergency';
                else category = 'Outing';
            } else {
                return res.status(400).json({ message: `Invalid pass type '${type}' for Hostel Students.` });
            }
        }

        const [restrictions] = await db.query(
            'SELECT reason FROM pass_restrictions WHERE department_id = ? AND academic_year = ?',
            [user.department_id, user.year]
        );

        if (restrictions.length > 0) {
            return res.status(403).json({
                message: `YEAR_BLOCK: Pass applications are currently suspended for ${user.year} students. Reason: ${restrictions[0].reason}`,
                severity: 'medium'
            });
        }

        // Basic validation: Check if user already has a pending/active request (excluding cancelled)
        const [existing] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? AND status NOT IN ("completed", "rejected", "cancelled")',
            [userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'You already have an active or pending request.' });
        }

        const [result] = await db.query(
            'INSERT INTO requests (user_id, type, reason, departure_date, return_date, status, category, requires_qr) VALUES (?, ?, ?, ?, ?, "pending", ?, ?)',
            [userId, type, reason, departure_date, return_date, category, requires_qr]
        );

        // Notify Student (Confirmation)
        await sendNotification(
            { userId },
            {
                title: 'Pass Application Submitted',
                message: `Your request (ID: #${result.insertId}) for ${type} has been submitted successfully.\nStatus: Pending Staff Approval`,
                type: 'success'
            }
        );

        // Notify Mentor
        if (user.mentor_id) {
            await sendNotification(
                { userId: user.mentor_id },
                {
                    title: 'New Student Request',
                    message: `${user.name} has requested a ${type} pass.`,
                    type: 'info',
                    link: '/staff/queue'
                }
            );
        }

        res.status(201).json({ message: 'Request submitted successfully', requestId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMyRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [requests] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [req.user.id, parseInt(limit), offset]
        );

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM requests WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            requests,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.cancelRequest = async (req, res) => {
    const requestId = req.params.id;
    console.log(`[DEBUG] Attempting cancel for Request ID: ${requestId} by User: ${req.user.id}`);

    try {
        // Debug: Check current status
        const [check] = await db.query('SELECT status FROM requests WHERE id = ? AND user_id = ?', [requestId, req.user.id]);
        console.log('[DEBUG] Request Status found:', check.length ? check[0].status : 'NOT FOUND');

        if (check.length) {
            const status = check[0].status;
            if (status === 'approved_warden') {
                // Penalty: 30 points for cancelling Gate Ready pass
                await deductTrustScore(req.user.id, 30, 'Late Cancellation: Cancelled Gate Ready pass');
            } else if (status === 'approved_staff') {
                // Penalty: 20 points for cancelling Staff Approved pass
                await deductTrustScore(req.user.id, 20, 'Late Cancellation: Cancelled Staff Approved pass');
            }
        }

        // Allow cancelling if status is pending or any approved state (before generation/exit)
        const [result] = await db.query(
            'UPDATE requests SET status = "cancelled" WHERE id = ? AND user_id = ? AND status IN ("pending", "approved_staff", "approved_hod", "approved_warden", "emergency")',
            [requestId, req.user.id]
        );
        console.log('[DEBUG] Update Result:', result);

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Cannot cancel. Request is already processed, blocked, or does not exist.' });
        }
        res.json({ message: 'Request cancelled successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.editRequest = async (req, res) => {
    const requestId = req.params.id;
    const { type, reason, departure_date, return_date } = req.body;

    if (!type || !departure_date || !return_date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Only allow editing if status is 'pending'
        const [result] = await db.query(
            'UPDATE requests SET type = ?, reason = ?, departure_date = ?, return_date = ? WHERE id = ? AND user_id = ? AND status = "pending"',
            [type, reason, departure_date, return_date, requestId, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Cannot edit. Request might not be pending or does not exist.' });
        }

        res.json({ message: 'Request updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
