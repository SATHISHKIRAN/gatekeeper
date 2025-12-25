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

exports.getDashboardStats = async (req, res) => {
    try {
        const staffId = req.user.id;
        const department_id = req.user.department_id;

        // 1. Pending Requests Count (Forwarded to this staff or general pending in dept if logic allows - assuming queue logic)
        // Reusing queue logic: Staff sees pending requests 
        const [[{ pendingCount }]] = await db.query(
            'SELECT COUNT(*) as pendingCount FROM requests r JOIN users u ON r.user_id = u.id WHERE u.department_id = ? AND r.status = "pending"',
            [department_id]
        );

        // 2. My Assigned Students Count (All students in department)
        const [[{ totalStudents }]] = await db.query(
            'SELECT COUNT(*) as totalStudents FROM users WHERE department_id = ? AND role = "student"',
            [department_id]
        );

        // 3. Today's Approved Passes
        const today = new Date().toISOString().split('T')[0];
        const [[{ todayApprovals }]] = await db.query(
            `SELECT COUNT(*) as todayApprovals FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? AND r.status IN ('approved_staff', 'approved_hod', 'approved_warden', 'generated', 'completed') 
             AND DATE(r.updated_at) = ?`,
            [department_id, today]
        );

        // 4. Average Trust Score
        const [[{ avgTrustScore }]] = await db.query(
            'SELECT AVG(trust_score) as avgTrustScore FROM users WHERE department_id = ? AND role = "student"',
            [department_id]
        );

        // 5. Recent Activity (Last 5 actions in department)
        const [recentActivity] = await db.query(
            `SELECT r.id, u.name as student_name, r.type, r.status, r.updated_at 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? 
             ORDER BY r.updated_at DESC LIMIT 5`,
            [department_id]
        );

        res.json({
            pendingCount,
            totalStudents,
            todayApprovals,
            avgTrustScore: Math.round(avgTrustScore || 100),
            recentActivity
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

        let query = `
            SELECT id, name, email, phone, year, student_type, trust_score, created_at,
            (SELECT COUNT(*) FROM requests WHERE user_id = users.id) as total_requests
            FROM users 
            WHERE department_id = ? AND role = "student"
        `;
        let params = [department_id];

        // Filter by assigned mentor?
        if (req.query.assigned === 'true') {
            query += ' AND mentor_id = ?';
            params.push(req.user.id);
        }

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
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

        // 1. Pass status distribution
        const [statusDist] = await db.query(
            `SELECT status, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? 
             GROUP BY status`,
            [department_id]
        );

        // 2. Weekly Request Trends (Last 7 days)
        const [weeklyTrends] = await db.query(
            `SELECT DATE(r.created_at) as date, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(r.created_at) 
             ORDER BY date ASC`,
            [department_id]
        );

        // 3. Request Types
        const [typeDist] = await db.query(
            `SELECT type, COUNT(*) as count 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? 
             GROUP BY type`,
            [department_id]
        );

        res.json({
            statusDetails: statusDist,
            weeklyTrends,
            typeDistribution: typeDist
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
            `SELECT r.*, u.name as student_name, u.year, u.trust_score
             FROM requests r
             JOIN users u ON r.user_id = u.id
             WHERE u.department_id = ? AND r.status NOT IN ('pending')
             ORDER BY r.updated_at DESC
             LIMIT ? OFFSET ?`,
            [department_id, parseInt(limit), offset]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total 
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE u.department_id = ? AND r.status NOT IN ('pending')`,
            [department_id]
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
                    u.parent_phone, u.address, u.created_at, u.register_number,
                    h.name as hostel_name, r.room_number,
                    m.name as mentor_name
             FROM users u
             LEFT JOIN hostels h ON u.hostel_id = h.id
             LEFT JOIN rooms r ON u.room_id = r.id
             LEFT JOIN users m ON u.mentor_id = m.id
             WHERE u.id = ? AND u.department_id = ? AND u.role = "student"`,
            [id, department_id]
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
        const { requestIds, action } = req.body; // action: 'approve' or 'reject'

        if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({ message: 'No requests selected' });
        }

        const status = action === 'approve' ? 'approved_staff' : 'rejected';

        // Verify all requests belong to department
        const [validRequests] = await db.query(
            `SELECT r.id, r.user_id FROM requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.id IN (?) AND u.department_id = ? AND r.status = 'pending'`,
            [requestIds, department_id]
        );

        if (validRequests.length === 0) {
            return res.status(400).json({ message: 'No valid pending requests found for selection' });
        }

        const validIds = validRequests.map(r => r.id);

        // Update status
        await db.query(
            'UPDATE requests SET status = ? WHERE id IN (?)',
            [status, validIds]
        );

        // Log actions and Notify students
        for (const reqData of validRequests) {
            await logStaffAction(staffId, action, { bulk: true }, reqData.id);

            const title = action === 'approve' ? 'Request Approved' : 'Request Rejected';
            const message = action === 'approve'
                ? 'Your request has been approved by staff and forwarded to HOD.'
                : 'Your request was rejected by staff.';

            // Link for student to check
            const studentLink = '/profile';

            await createNotification(reqData.user_id, title, message, action === 'approve' ? 'success' : 'error', studentLink);
        }

        res.json({ message: `Successfully processed ${validIds.length} requests`, count: validIds.length });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error performing bulk action' });
    }
};
