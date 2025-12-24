const db = require('../config/database');
const { sendNotification } = require('./notificationController');
const { generateSecureOriginal, encryptQRProxy } = require('../utils/cryptoUtils');

exports.getQueue = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const department_id = req.user.department_id;

        let query = `
            SELECT r.*, u.name as student_name, u.trust_score, u.year
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ?
        `;
        let params = [department_id];

        if (role === 'staff') {
            // Staff sees ONLY pending requests from their assigned students
            query += ' AND u.mentor_id = ? AND r.status = "pending"';
            params.push(userId);
        } else if (role === 'hod') {
            // HOD sees only requests already approved by staff
            query += ' AND r.status = "approved_staff"';
        }

        query += ' ORDER BY r.created_at ASC';

        const [requests] = await db.query(query, params);
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getHODQueue = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const [requests] = await db.query(
            `SELECT r.*, u.name as student_name, u.trust_score, u.year
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? AND r.status = 'approved_staff'
             ORDER BY r.created_at ASC`,
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
    if (role === 'staff' && !['approved_staff', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status transition for staff.' });
    }
    if (role === 'hod' && !['approved_hod', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status transition for HOD.' });
    }

    try {
        // Fetch request details + student info + department info for routing
        const [[request]] = await db.query(`
            SELECT r.*, u.student_type, u.name as student_name, u.department_id, u.hostel_id, h.warden_id
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE r.id = ?
        `, [id]);

        if (!request) return res.status(404).json({ message: 'Request not found' });

        const studentId = request.user_id;

        // Logic
        let finalStatus = status;
        let finalTitle = status === 'rejected' ? 'Request Rejected' : 'Pass Approved';
        let finalMessage = '';

        if (role === 'hod' && status === 'approved_hod') {
            if (request.student_type === 'day_scholar') {
                // Day scholars: HOD is final
                if (request.requires_qr) {
                    const verifyCode = generateSecureOriginal();
                    const payload = {
                        id: id,
                        uid: studentId,
                        code: verifyCode,
                        ts: Date.now()
                    };
                    const qrHash = encryptQRProxy(payload);
                    await db.query('UPDATE requests SET qr_code_hash = ?, verify_code = ? WHERE id = ?', [qrHash, verifyCode, id]);
                }
                finalMessage = 'Your request has been officially approved by the HOD. (Final Approval)';

                // HOD Final Approval Notification
                await sendNotification({ userId: studentId }, { title: 'Pass Approved ✅', message: finalMessage, type: 'success' });

            } else {
                // Hostel student: Forward to Warden
                finalMessage = 'HOD has approved your pass. It is now with the Warden for final clearance.';

                // Notify Student
                await sendNotification({ userId: studentId }, { title: 'Step 2 Cleared 🛡️', message: finalMessage, type: 'info' });

                // Notify Warden
                if (request.warden_id) {
                    await sendNotification(
                        { userId: request.warden_id },
                        {
                            title: 'New Verification Request',
                            message: `${request.student_name} (Year ${request.year || ''}) has been approved by HOD.`,
                            type: 'info',
                            link: '/warden/verify'
                        }
                    );
                }
            }
        } else if (status === 'approved_staff') {
            finalMessage = 'Your request has been approved by your department staff. It is now with the HOD for verification.';

            // Notify Student
            await sendNotification({ userId: studentId }, { title: 'Step 1 Cleared 📝', message: finalMessage, type: 'info' });

            // Notify HOD
            await sendNotification(
                { role: 'hod', departmentId: request.department_id },
                {
                    title: 'New Pass Request',
                    message: `Staff approved request for ${request.student_name}. Awaiting your review.`,
                    type: 'info',
                    link: '/hod/requests'
                }
            );

        } else {
            // Rejected
            finalMessage = 'Your gate pass request was rejected by your department.';
            await sendNotification({ userId: studentId }, { title: finalTitle, message: finalMessage, type: 'error' });
        }

        await db.query(
            'UPDATE requests SET status = ? WHERE id = ?',
            [finalStatus, id]
        );

        res.json({ message: `Request ${status === 'rejected' ? 'rejected' : 'approved'} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
