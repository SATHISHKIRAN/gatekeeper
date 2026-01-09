const db = require('../config/database');
const { sendNotification } = require('./notificationController');
const { generateSecureOriginal, encryptQRProxy } = require('../utils/cryptoUtils');

exports.getQueue = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const department_id = req.user.department_id;

        // Base query - Fetch enriched request details
        let query = `
            SELECT r.*, u.name as student_name, u.trust_score, u.year, u.student_type, u.register_number, u.phone, u.parent_phone, u.profile_image,
                   d.name as department_name, h.name as hostel_name, rm.room_number
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN rooms rm ON u.room_id = rm.id
            WHERE u.department_id = ?
        `;
        let params = [department_id];

        if (role === 'staff') {
            const isProxyActive = req.user.is_proxy_active;

            if (isProxyActive) {
                // Assistant HOD (Proxy) sees:
                // 1. Their own mentees' pending requests
                // 2. Departmental requests approved by staff (Step 2)
                // 3. Escalated pending requests (Mentors on leave)
                query += ` AND (
                    (u.mentor_id = ? AND r.status = "pending")
                    OR (r.status = "approved_staff")
                    OR (r.status = "pending" AND u.mentor_id IN (
                        SELECT user_id FROM staff_leaves 
                        WHERE status = 'approved' AND CURDATE() BETWEEN start_date AND end_date
                    ))
                ) ORDER BY r.status DESC, r.created_at ASC`;
                params.push(userId);
            } else {
                // STRICT MODE: Regular Staff ONLY sees pending requests from their assigned mentees
                // Added explicit parenthesis for safety
                query += ' AND (u.mentor_id = ? AND r.status = "pending") ORDER BY r.created_at ASC';
                params.push(userId);
            }
        } else if (role === 'hod') {
            // HOD sees:
            // 1. Pending requests where THEY are the mentor (Step 1)
            // 2. Approved-by-staff requests for the department (Step 2)
            query += ` AND (r.status = "approved_staff" OR (u.mentor_id = ? AND r.status = "pending"))
                       ORDER BY r.status DESC, r.created_at ASC`;
            params.push(userId);
        } else if (role === 'warden') {
            // Warden sees only 'approved_hod' (Ready for Warden)
            query += ` AND r.status = "approved_hod" ORDER BY r.created_at ASC`;
        }

        const [requests] = await db.query(query, params);
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving queue' });
    }
};

exports.getHODQueue = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const [requests] = await db.query(
            `SELECT r.*, u.name as student_name, u.trust_score, u.year, u.student_type, u.register_number, u.phone, u.parent_phone, u.profile_image,
                    d.name as department_name, h.name as hostel_name, rm.room_number
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN hostels h ON u.hostel_id = h.id
             LEFT JOIN rooms rm ON u.room_id = rm.id
             WHERE u.department_id = ? AND r.status IN ('approved_staff', 'pending')
             ORDER BY 
                CASE WHEN r.type = 'emergency' THEN 1 ELSE 2 END ASC,
                FIELD(r.status, 'approved_staff', 'pending'), 
                r.created_at ASC`,
            [department_id]
        );
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved_staff' or 'rejected'

    const role = req.user.role;

    // Validation
    // Validation: Check if user has permission for the TARGET status
    // Staff can only approve to 'approved_staff' or reject
    if (role === 'staff' && !['approved_staff', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status transition for staff.' });
    }
    // HOD can approve to 'approved_staff' (if mentor) or 'approved_hod' or reject
    if (role === 'hod' && !['approved_staff', 'approved_hod', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status transition for HOD.' });
    }

    try {
        // Fetch request details + student info + department info for routing
        const [[request]] = await db.query(`
            SELECT r.*, u.student_type, u.name as student_name, u.department_id, u.hostel_id, h.warden_id, u.mentor_id
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE r.id = ?
        `, [id]);

        if (!request) return res.status(404).json({ message: 'Request not found' });

        // Permission Check: Staff can only update their own mentees
        // EXCEPTION: Active Proxies (Assistant HODs) can manage departmental requests
        const isProxy = req.user.is_proxy_active;

        if (role === 'staff' && !isProxy && request.mentor_id !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only manage your assigned mentees.' });
        }

        const studentId = request.user_id;

        // Logic
        let finalStatus = status;
        let finalTitle = status === 'rejected' ? 'Request Rejected' : 'Pass Approved';
        let finalMessage = '';

        if (role === 'hod' && status === 'approved_hod') {
            if (request.student_type === 'day_scholar') {
                finalMessage = 'Your request has been officially approved by the HOD. You can now proceed to the gate.';
            } else {
                finalMessage = 'HOD has recommended your pass. It is now with the Warden for final clearance.';
            }
        } else if (status === 'approved_staff') {
            finalMessage = 'Your request has been recommended by your Mentor. It is now with the HOD for verification.';
        } else {
            // Rejected
            finalMessage = `Your gate pass request was rejected by your department.${remarks ? ` Reason: ${remarks}` : ''}`;
        }

        // 1. CRITICAL: Update Database FIRST to ensure status is saved
        await db.query(
            'UPDATE requests SET status = ? WHERE id = ?',
            [finalStatus, id]
        );

        // 1.5 Log Action to staff_actions (for Timeline)
        const actionType = role === 'hod' ? (status === 'rejected' ? 'reject_hod' : 'approve_hod') : (status === 'rejected' ? 'reject_staff' : 'approve_staff');
        const actionDetails = { reason: remarks || '' };

        await db.query(
            'INSERT INTO staff_actions (staff_id, request_id, action_type, details) VALUES (?, ?, ?, ?)',
            [req.user.id, id, actionType, JSON.stringify(actionDetails)]
        );

        // 2. Send Notifications in Background (Fire & Forget)
        const sendBackgroundNotifications = async () => {
            console.log(`[BG] Sending notifications for Request ${id} (${status})`);
            try {
                if (role === 'hod' && status === 'approved_hod') {
                    if (request.student_type === 'day_scholar') {
                        await sendNotification({ userId: studentId }, { title: 'Pass Approved ✅', message: finalMessage, type: 'success', category: 'request', entityId: id });
                    } else {
                        // Hostel: Notify Student + Warden
                        await sendNotification({ userId: studentId }, { title: 'Step 2 Cleared 🛡️', message: finalMessage, type: 'info', category: 'request', entityId: id });
                        if (request.warden_id) {
                            await sendNotification(
                                { userId: request.warden_id },
                                {
                                    title: 'New Verification Request',
                                    message: `${request.student_name} (Year ${request.year || ''}) has been approved by HOD.`,
                                    type: 'info',
                                    link: '/warden/verify',
                                    category: 'approval_pending',
                                    entityId: id
                                }
                            );
                        }
                    }
                } else if (status === 'approved_staff') {
                    await sendNotification({ userId: studentId }, { title: 'Step 1 Cleared 📝', message: finalMessage, type: 'info', category: 'request', entityId: id });
                    await sendNotification(
                        { role: 'hod', departmentId: request.department_id },
                        {
                            title: 'New Pass Request',
                            message: `Mentor approved request for ${request.student_name}. Awaiting your review.`,
                            type: 'info',
                            link: '/hod/requests',
                            category: 'approval_pending',
                            entityId: id
                        }
                    );
                } else {
                    // Rejected
                    await sendNotification({ userId: studentId }, { title: finalTitle, message: finalMessage, type: 'error', category: 'request', entityId: id });
                }
            } catch (err) {
                console.error(`[BG] Notification Error for Req ${id}:`, err);
            }
        };

        sendBackgroundNotifications();

        res.json({ message: `Request ${status === 'rejected' ? 'rejected' : 'approved'} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
