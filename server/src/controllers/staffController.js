const db = require('../config/database');
const { createNotification } = require('./notificationController');

// Helper to log staff actions
const logStaffAction = async (staffId, actionType, details, requestId = null) => {
    try {
        await db.query(
            'INSERT INTO staff_actions (staff_id, request_id, action_type, details) VALUES (?, ?, ?, ?)',
            [staffId, requestId, actionType, JSON.stringify(details)]
        );
    } catch (err) {
        console.error('Error logging staff action:', err);
    }
};

exports.getProfile = async (req, res) => {
    try {
        const staffId = req.user.id;
        const [users] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, u.profile_image, d.name as department_name 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            WHERE u.id = ?`,
            [staffId]
        );

        if (users.length === 0) return res.status(404).json({ message: 'Staff not found' });
        const user = users[0];

        // Stats
        const [[{ mentees }]] = await db.query('SELECT COUNT(*) as mentees FROM users WHERE mentor_id = ?', [staffId]);
        const [[{ approved }]] = await db.query('SELECT COUNT(*) as approved FROM staff_actions WHERE staff_id = ? AND action_type = "approve"', [staffId]);

        res.json({
            user,
            stats: {
                mentees_count: mentees,
                approvals_given: approved,
                status: 'Active'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const staffId = req.user.id;
        const department_id = req.user.department_id;

        // 1. Pending Requests Count (Assigned Mentees Only)
        const [[{ pendingCount }]] = await db.query(
            'SELECT COUNT(*) as pendingCount FROM requests r JOIN users u ON r.user_id = u.id WHERE u.mentor_id = ? AND r.status = "pending"',
            [staffId]
        );

        // 2. My Assigned Students Count (Mentees Only)
        const [[{ totalStudents }]] = await db.query(
            'SELECT COUNT(*) as totalStudents FROM users WHERE mentor_id = ? AND role = "student"',
            [staffId]
        );

        // 3. Today's Approved Passes (Mentees Only)
        const today = new Date().toISOString().split('T')[0];
        const [[{ todayApprovals }]] = await db.query(
            `SELECT COUNT(*) as todayApprovals FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? AND r.status IN ('approved_staff', 'approved_hod', 'approved_warden', 'generated', 'completed') 
             AND DATE(r.updated_at) = ?`,
            [staffId, today]
        );

        // 4. Average Trust Score (Mentees Only)
        const [[{ avgTrustScore }]] = await db.query(
            'SELECT AVG(trust_score) as avgTrustScore FROM users WHERE mentor_id = ? AND role = "student"',
            [staffId]
        );

        // 5. Recent Activity (Mentees Only), excluding cancelled
        const [recentActivity] = await db.query(
            `SELECT r.id, u.name as student_name, r.type, r.status, r.updated_at 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? AND r.status != 'cancelled'
             ORDER BY r.updated_at DESC LIMIT 5`,
            [staffId]
        );

        // 6. Check Global Proxy Status
        const [proxyCheck] = await db.query(
            'SELECT * FROM proxy_settings WHERE proxy_id = ? AND is_active = TRUE AND CURDATE() BETWEEN start_date AND end_date',
            [staffId]
        );
        const isGlobalProxy = proxyCheck.length > 0;

        // 7. Check if Staff is On Leave
        const [leaveCheck] = await db.query(
            'SELECT * FROM staff_leaves WHERE user_id = ? AND status = "approved" AND CURDATE() BETWEEN start_date AND end_date',
            [staffId]
        );
        const isOnLeave = leaveCheck.length > 0;

        // 8. Proxy Pending Requests Count
        let proxyPendingCount = 0;
        if (isGlobalProxy) {
            const [[{ count }]] = await db.query(
                `SELECT COUNT(*) as count
                 FROM requests r
                 JOIN users u ON r.user_id = u.id
                 WHERE u.department_id = ? 
                 AND (
                    (r.status = 'approved_staff') OR 
                    (r.status = 'pending' AND u.mentor_id IN (
                        SELECT user_id FROM staff_leaves 
                        WHERE status = 'approved' AND CURDATE() BETWEEN start_date AND end_date
                    ))
                 )
                 AND r.status != 'rejected'`,
                [department_id]
            );
            proxyPendingCount = count || 0;
        }

        res.json({
            pendingCount,
            totalStudents,
            todayApprovals,
            avgTrustScore: Math.round(avgTrustScore || 100),
            recentActivity,
            isGlobalProxy,
            isOnLeave,
            proxyPendingCount
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving dashboard stats' });
    }
};

exports.getMyStudents = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const { search, year, sort } = req.query;

        // Base query - STRICTLY assigned mentees only
        let query = `
            SELECT id, name, email, phone, year, student_type, trust_score, created_at, register_number,
            (SELECT COUNT(*) FROM requests WHERE user_id = users.id) as total_requests
            FROM users 
            WHERE mentor_id = ? AND role = "student"
        `;
        let params = [req.user.id];

        // Search Filter

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR register_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (year) {
            query += ' AND year = ?';
            params.push(year);
        }

        if (sort === 'trust_asc') query += ' ORDER BY trust_score ASC';
        else if (sort === 'trust_desc') query += ' ORDER BY trust_score DESC';
        else if (sort === 'requests_desc') query += ' ORDER BY total_requests DESC';
        else query += ' ORDER BY name ASC';

        const [students] = await db.query(query, params);
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving students' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const department_id = req.user.department_id;

        const staffId = req.user.id;

        // 1. Pass status distribution (Mentees Only)
        const [statusDist] = await db.query(
            `SELECT r.status, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? 
             GROUP BY r.status`,
            [staffId]
        );

        // 2. Weekly Request Trends (Last 7 days)
        const [weeklyTrends] = await db.query(
            `SELECT DATE(r.created_at) as date, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(r.created_at) 
             ORDER BY date ASC`,
            [staffId]
        );

        // 3. Request Types
        const [typeDist] = await db.query(
            `SELECT r.type, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? 
             GROUP BY r.type`,
            [staffId]
        );

        // 4. Year-wise Distribution
        const [yearDist] = await db.query(
            `SELECT u.year, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? 
             GROUP BY u.year`,
            [staffId]
        );

        // 5. Peak Activity Hours (Last 30 days)
        const [peakActivity] = await db.query(
            `SELECT HOUR(r.departure_date) as hour, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? AND r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY HOUR(r.departure_date) 
             ORDER BY hour ASC`,
            [staffId]
        );

        // 6. Top 5 Movers
        const [topMovers] = await db.query(
            `SELECT u.name, COUNT(r.id) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? 
             GROUP BY u.id 
             ORDER BY count DESC 
             LIMIT 50`,
            [staffId]
        );

        // 7. General Summary Stats
        const [[summary]] = await db.query(
            `SELECT 
                COUNT(*) as totalRequests,
                SUM(CASE WHEN r.status IN ('approved_staff', 'approved_hod', 'approved_warden', 'generated', 'completed') THEN 1 ELSE 0 END) as approvedRequests,
                SUM(CASE WHEN r.status = 'generated' THEN 1 ELSE 0 END) as activeOutside,
                (SELECT AVG(trust_score) FROM users WHERE mentor_id = ? AND role = 'student') as avgTrustScore
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ?`,
            [staffId, staffId]
        );

        res.json({
            statusDetails: statusDist,
            weeklyTrends,
            typeDistribution: typeDist,
            yearDistribution: yearDist,
            peakActivity,
            topMovers,
            summary
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving analytics' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [history] = await db.query(
            `SELECT r.*, u.name as student_name, u.year, u.trust_score, u.phone as student_phone
             FROM requests r
             JOIN users u ON r.user_id = u.id
             WHERE u.mentor_id = ? AND r.status NOT IN ('pending')
             ORDER BY r.updated_at DESC
             LIMIT ? OFFSET ?`,
            [req.user.id, parseInt(limit), offset]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.mentor_id = ? AND r.status NOT IN ('pending')`,
            [req.user.id]
        );

        res.json({
            history,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving history' });
    }
};

exports.getStudentProfile = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const { id } = req.params;

        // Verify student belongs to staff's department AND fetch enriched details
        const [[student]] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.year, u.student_type, u.trust_score, 
                    u.parent_phone, u.address, u.created_at, u.register_number, u.profile_image,
                    h.name as hostel_name, r.room_number,
                    m.name as mentor_name
             FROM users u
             LEFT JOIN hostels h ON u.hostel_id = h.id
             LEFT JOIN rooms r ON u.room_id = r.id
             LEFT JOIN users m ON u.mentor_id = m.id
             WHERE u.id = ? AND u.mentor_id = ? AND u.role = "student"`,
            [id, req.user.id]
        );

        if (!student) {
            return res.status(404).json({ message: 'Student not found or not in your department' });
        }

        // Get student's request history
        const [requests] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC',
            [id]
        );

        // Calculate simple stats
        const stats = {
            total: requests.length,
            approved: requests.filter(r => ['generated', 'completed', 'approved_warden'].includes(r.status)).length,
            rejected: requests.filter(r => r.status === 'rejected').length,
            pending: requests.filter(r => r.status === 'pending').length
        };

        res.json({ student, requests, stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving student profile' });
    }
};

exports.bulkApprove = async (req, res) => {
    try {
        const staffId = req.user.id;
        const department_id = req.user.department_id;
        const { requestIds, action } = req.body;
        const defaultStatus = action === 'approve' ? 'approved_staff' : 'rejected';

        // Check if user is a GLOBAL PROXY (Assistant HOD)
        const [proxyCheck] = await db.query(
            'SELECT * FROM proxy_settings WHERE proxy_id = ? AND is_active = TRUE AND CURDATE() BETWEEN start_date AND end_date',
            [staffId]
        );
        const isGlobalProxy = proxyCheck.length > 0;

        // Fetch all relevant requests (Both Mentee & Forwarded/Dept-level)
        // We will filter and process them
        // 1. Mentee Requests (status 'pending')
        // 2. Forwarded/Proxy Requests (status 'approved_staff' OR 'pending' + mentor leave OR forwarded_to me)

        const query = `
            SELECT r.id, r.user_id, r.forwarded_to, r.status, u.mentor_id, u.student_type, u.name as student_name 
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id IN (?) 
            AND u.department_id = ?
        `;

        const [allRequests] = await db.query(query, [requestIds, department_id]);

        if (allRequests.length === 0) {
            return res.status(404).json({ message: 'No valid requests found.' });
        }

        let processedCount = 0;
        let proxyActionTaken = false;

        for (const reqData of allRequests) {
            let newStatus = defaultStatus;
            let isProxyAction = false;
            let canProcess = false;

            const isMentee = reqData.mentor_id === staffId && reqData.status === 'pending';
            const isForwarded = reqData.forwarded_to === staffId;
            const isDeptReady = reqData.status === 'approved_staff' || (reqData.status === 'pending'); // Simplified proxy rights

            // DECISION LOGIC
            // If I am Global Proxy, I have SUPER POWER on everything
            if (isGlobalProxy && action === 'approve') {
                // I can process ANY request in my department that is pending/approved_staff
                // Since I am acting as HOD, I set the FINAL status for HOD level
                canProcess = true;
                isProxyAction = true;

                // "Fast-Track" Logic based on Student Type
                if (reqData.student_type === 'Day Scholar') {
                    newStatus = 'approved_hod'; // HOD Approval for Day Scholar = Ready to Exit
                } else {
                    newStatus = 'approved_hod'; // HOD Approval for Hostel = To Warden
                }
            }
            // If NOT Global Proxy, but request is Forwarded to me explicitly
            else if (isForwarded && action === 'approve') {
                canProcess = true;
                isProxyAction = true;
                newStatus = 'approved_hod';
            }
            // If normal Mentor (Mentee + Pending)
            else if (isMentee) {
                canProcess = true;
                // Standard flow
                if (action === 'approve') newStatus = 'approved_staff';
                else newStatus = 'rejected';
            }

            if (canProcess) {
                // Execute Update
                await db.query(
                    'UPDATE requests SET status = ?, forwarded_to = NULL WHERE id = ?',
                    [newStatus, reqData.id]
                );

                // Notifications & Logging
                const logActionType = action === 'approve'
                    ? (isProxyAction ? 'approve_hod' : 'approve_staff')
                    : (isProxyAction ? 'reject_hod' : 'reject_staff');

                // Track fast_track only if it resulted in a ready-to-exit state for Day Scholars
                const isFastTrack = newStatus === 'approved_hod' && reqData.student_type === 'Day Scholar';

                await logStaffAction(staffId, logActionType, { proxy: isProxyAction, fast_track: isFastTrack }, reqData.id);

                let title = '';
                let message = '';
                let notifType = action === 'approve' ? 'success' : 'error';

                if (action === 'rejected' || action === 'reject') {
                    title = isProxyAction ? 'Request Rejected (Assistant HOD)' : 'Request Rejected';
                    message = `Your request was rejected by ${isProxyAction ? 'Assistant HOD' : 'Staff'}. Please contact your mentor for details.`;
                } else {
                    // Approved
                    if (isProxyAction) {
                        title = 'Approved by Assistant HOD';
                        const { sendNotification } = require('./notificationController');

                        if (newStatus === 'approved_hod' && reqData.student_type === 'Day Scholar') {
                            message = 'Your pass has been approved by Assistant HOD and is Ready for Exit (Day Scholar).';
                            // Notify Gatekeeper
                            sendNotification(
                                { role: 'gatekeeper' },
                                {
                                    title: 'New Pass Approved (Proxy)',
                                    message: 'A new pass has been approved by Assistant HOD and is ready for exit.',
                                    type: 'info',
                                    category: 'request',
                                    link: '/gate/dashboard'
                                }
                            ).catch(e => console.error('Bg Notif Error:', e));
                        } else {
                            message = 'Your pass has been approved by Assistant HOD and forwarded to Warden.';
                            // Notify Warden
                            sendNotification(
                                { role: 'warden' },
                                {
                                    title: 'New HOD Approved Requests (Proxy)',
                                    message: 'A request has been approved by Assistant HOD and is ready for your review.',
                                    type: 'info',
                                    category: 'request',
                                    link: '/warden/requests'
                                }
                            ).catch(e => console.error('Bg Notif Error:', e));
                        }
                    } else {
                        title = 'Request Recommended';
                        message = 'Your request has been recommended by staff and forwarded for HOD approval.';

                        // Notify HOD (via NotificationController -> Socket)
                        const { sendNotification } = require('./notificationController');
                        sendNotification(
                            { role: 'hod', departmentId: department_id },
                            {
                                title: 'New Pending Request',
                                message: 'A request has been recommended by staff and requires your approval.',
                                type: 'info',
                                category: 'request',
                                link: '/hod/requests'
                            }
                        ).catch(e => console.error('Bg Notif Error:', e));
                    }
                }

                // Fire and Forget Notification
                createNotification(reqData.user_id, title, message, notifType, '/profile', 'request')
                    .catch(e => console.error('Bg Notif Error:', e));
                processedCount++;
                if (isProxyAction) proxyActionTaken = true;
            }
        }

        if (processedCount > 0) {
            res.json({
                message: `Successfully processed ${processedCount} requests.`,
                meta: { was_proxy_action: proxyActionTaken }
            });
        } else {
            res.status(403).json({ message: 'No requests could be processed. Check permissions or status.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error performing bulk action' });
    }
};

exports.getProxyPendingRequests = async (req, res) => {
    try {
        const staffId = req.user.id;
        const department_id = req.user.department_id;

        // Check Global Proxy Status
        const [proxyCheck] = await db.query(
            'SELECT * FROM proxy_settings WHERE proxy_id = ? AND is_active = TRUE AND CURDATE() BETWEEN start_date AND end_date',
            [staffId]
        );
        const isGlobalProxy = proxyCheck.length > 0;

        // Fetch requests waiting for HOD approval
        // Visible if: (I am Global Proxy) OR (Forwarded To Me)
        // AND Status is appropriate

        const [requests] = await db.query(
            `SELECT r.*, u.name as student_name, u.year, u.trust_score, u.student_type, u.profile_image
             FROM requests r
             JOIN users u ON r.user_id = u.id
             WHERE u.department_id = ? 
             AND (
                (? = TRUE) OR (r.forwarded_to = ?)
             )
             AND (
                r.status = 'approved_staff' 
                OR (
                    r.status = 'pending' 
                    AND u.mentor_id IN (
                        SELECT user_id FROM staff_leaves 
                        WHERE status = 'approved' AND CURDATE() BETWEEN start_date AND end_date
                    )
                )
             )
             AND r.status != 'rejected'
             ORDER BY r.updated_at ASC`,
            [department_id, isGlobalProxy, staffId]
        );

        res.json({
            requests,
            isGlobalProxy
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching proxy requests', error: error.message, stack: error.stack });
    }
};

exports.proxyMedicalOverride = async (req, res) => {
    const { studentEmail, reason } = req.body;
    const staffId = req.user.id;
    const department_id = req.user.department_id;

    try {
        // 1. Verify Active Proxy Status
        const [proxyCheck] = await db.query(
            'SELECT * FROM proxy_settings WHERE proxy_id = ? AND is_active = TRUE AND CURDATE() BETWEEN start_date AND end_date',
            [staffId]
        );

        if (proxyCheck.length === 0) {
            return res.status(403).json({ message: 'UNAUTHORIZED: You do not have active HOD delegation privileges.' });
        }

        // 2. Find Student & Type
        const [users] = await db.query('SELECT id, student_type FROM users WHERE email = ? AND role = "student" AND department_id = ?', [studentEmail, department_id]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found in your department' });

        const student = users[0];
        const studentId = student.id;

        // 3. Determine Status based on Type
        // Day Scholar -> Ready to Exit (generated)
        // Hosteler -> Pending Warden (approved_hod)
        let status = 'approved_hod';
        let notifMessage = `Proxy HOD Approved (Staff ID: ${staffId}). Proceed to Warden for final clearance.`;

        if (student.student_type === 'Day Scholar') {
            status = 'generated';
            notifMessage = `Proxy HOD Approved (Staff ID: ${staffId}). Pass Generated - Ready for Gate.`;
        }

        // 4. Create Emergency Pass
        const [result] = await db.query(
            'INSERT INTO requests (user_id, type, reason, departure_date, return_date, status, category) VALUES (?, "emergency", ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), DATE_ADD(NOW(), INTERVAL 1 DAY), ?, "critical")',
            [studentId, reason || "Medical Emergency Override by Assistant HOD", status]
        );

        const rId = result.insertId;

        // 5. Log Action
        await db.query(
            'INSERT INTO staff_actions (staff_id, request_id, action_type, details) VALUES (?, ?, ?, ?)',
            [staffId, rId, 'approve_hod', JSON.stringify({ reason: 'medical_override_proxy', authority: 'delegated_proxy', proxy_staff_id: staffId, student_type: student.student_type })]
        );

        // 6. Notify Student
        await createNotification(studentId, 'PROXY HOD APPROVED 🚨', notifMessage, 'success', null, 'request');

        res.json({ message: `Emergency override issued. Status: ${status === 'generated' ? 'READY TO GATE' : 'FORWARDED TO WARDEN'}`, requestId: result.insertId });
    } catch (error) {
        console.error('Proxy Override Error:', error);
        res.status(500).json({ message: 'Delegated override failed.' });
    }
};

exports.getProxyOverrideHistory = async (req, res) => {
    const staffId = req.user.id;

    try {
        const [history] = await db.query(`
            SELECT 
                sa.created_at as timestamp,
                r.reason,
                r.status,
                u.name as student_name,
                u.register_number,
                u.email
            FROM staff_actions sa
            JOIN requests r ON sa.request_id = r.id
            JOIN users u ON r.user_id = u.id
            WHERE sa.staff_id = ? AND sa.action_type = 'approve_hod'
            ORDER BY sa.created_at DESC
            LIMIT 50
        `, [staffId]);

        res.json(history);
    } catch (error) {
        console.error('Proxy History Error:', error);
        res.status(500).json({ message: 'Failed to fetch override history.' });
    }
};

exports.getStudentsOnLeave = async (req, res) => {
    try {
        const staffId = req.user.id;
        // Fetch mentees who are effectively "On Leave" or "Out" today
        // Logic: Mentee ID AND (Status = 'out' OR Date Overlap for valid passes)
        // Note: For Permission passes, return_date is NULL, so we assume single-day validity (Departure Date)

        const [students] = await db.query(`
            SELECT u.id, u.name, u.student_type, u.year, u.phone, u.profile_image, 
                   r.type as pass_type, r.status, r.departure_date, r.return_date
            FROM users u
            JOIN requests r ON u.id = r.user_id
            WHERE u.mentor_id = ?
            AND r.type IN ('Leave', 'On Duty')
            AND r.status NOT IN ('pending', 'rejected', 'cancelled', 'expired', 'approved_staff', 'completed')
            AND (
                r.status IN ('out', 'active') 
                OR (
                    DATE(r.departure_date) <= CURDATE() 
                    AND (
                        r.return_date IS NULL 
                        OR DATE(r.return_date) >= CURDATE()
                    )
                )
            )
            ORDER BY r.departure_date DESC
        `, [staffId]);

        res.json(students);
    } catch (error) {
        console.error('Error fetching students on leave:', error);
        res.status(500).json({ message: 'Error fetching students on leave' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const staffId = req.user.id;
        const { startDate, endDate, status, year, studentType } = req.query;

        // Base Query - Filter by Mentor ID
        let query = `
            SELECT 
                r.id, r.type, r.reason, r.status, r.created_at, r.departure_date, r.return_date,
                u.name as student_name, u.register_number, u.year, u.student_type, u.phone as student_phone,
                h.name as hostel_name, room.room_number,
                m.name as mentor_name
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users m ON u.mentor_id = m.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN rooms room ON u.room_id = room.id
            WHERE u.mentor_id = ?
        `;

        const params = [staffId];

        if (startDate && endDate) {
            query += ` AND r.created_at BETWEEN ? AND ?`;
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        }

        if (status) {
            const statusArray = status.split(',');
            query += ` AND r.status IN (?)`;
            params.push(statusArray);
        }

        if (year) {
            const yearArray = year.split(',');
            query += ` AND u.year IN (?)`;
            params.push(yearArray);
        }

        if (studentType) {
            query += ` AND u.student_type = ?`;
            params.push(studentType);
        }

        query += ` ORDER BY r.created_at DESC`;

        const [results] = await db.query(query, params);

        res.json(results);
    } catch (error) {
        console.error('Staff Reports Error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};
