const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Fetch user details with Mentor info aliased
        const [users] = await db.query(`
            SELECT 
                u.id, u.name, u.email, u.role, u.department_id, u.trust_score, 
                u.student_type, u.register_number, u.year, u.phone,
                m.name as mentor_name, 
                m.email as mentor_email, 
                m.phone as mentor_phone, 
                m.register_number as mentor_register_number
            FROM users u
            LEFT JOIN users m ON u.mentor_id = m.id
            WHERE u.id = ?
        `, [studentId]);

        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = users[0];

        // Fetch Department Name (Mock join or separate query if needed, but for now assuming dept_id is enough or we fetch name)
        // Ideally we would JOIN departments table, but assuming schema simplicity for now

        let profileData = { ...user };

        if (user.student_type === 'hostel') {
            const [assignments] = await db.query(`
                SELECT 
                    r.room_number, 
                    h.name as hostel_name, 
                    u.name as warden_name,
                    u.email as warden_email,
                    u.phone as warden_phone,
                    u.register_number as warden_register_number
                FROM hostel_assignments ha 
                JOIN rooms r ON ha.room_id = r.id 
                JOIN hostels h ON r.hostel_id = h.id 
                LEFT JOIN users u ON h.warden_id = u.id 
                WHERE ha.student_id = ? AND ha.status = 'active'
            `, [studentId]);

            if (assignments.length > 0) {
                profileData.hostel_details = assignments[0];
            } else {
                profileData.hostel_details = { hostel_name: 'Not Assigned', room_number: 'N/A', warden_name: 'N/A' };
            }
        }


        res.json(profileData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const studentId = req.user.id;
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM requests WHERE user_id = ? AND status = 'completed') as completed_requests,
                (SELECT COUNT(*) FROM requests WHERE user_id = ? AND status = 'pending') as pending_requests,
                (SELECT trust_score FROM users WHERE id = ?) as trust_score
        `, [studentId, studentId, studentId]);

        res.json(stats[0] || { completed_requests: 0, pending_requests: 0, trust_score: 100 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const [history] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC',
            [studentId]
        );
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching history' });
    }
};

exports.cancelPass = async (req, res) => {
    try {
        const { requestId } = req.body;
        const studentId = req.user.id; // Security check

        // 1. Verify ownership and status
        const [requests] = await db.query(
            'SELECT id, status FROM requests WHERE id = ? AND user_id = ?',
            [requestId, studentId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const request = requests[0];

        // Allow cancellation if not fully approved/generated/completed
        // Logic: Can cancel if pending or partially approved. Cannot changes if 'generated' or 'completed' (pass active/done) or 'rejected'
        const cancellableStates = ['pending', 'approved_staff', 'approved_hod', 'approved_warden'];

        if (!cancellableStates.includes(request.status)) {
            return res.status(400).json({ message: 'Cannot cancel pass in this stage (Active or Finalized).' });
        }

        // 2. Update status
        await db.query('UPDATE requests SET status = "cancelled" WHERE id = ?', [requestId]);

        res.json({ message: 'Pass request cancelled successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Cancellation failed' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const studentId = req.user.id;

        // 1. Get current hash
        const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [studentId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }

        // 3. Hash new password
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        // 4. Update DB
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, studentId]);

        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Password change failed' });

    }
};

exports.getWalletData = async (req, res) => {
    try {
        const studentId = req.user.id;

        // 1. Fetch Student Identity Details
        const [users] = await db.query(
            'SELECT id, name, email, register_number, year, student_type, department_id FROM users WHERE id = ?',
            [studentId]
        );
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = users[0];

        // 2. Fetch Active Pass (if any)
        // Active = approved_warden, generated, or approved_hod (for day scholars)
        // And not expired (return_date > now) - optional strict check, but usually status drives visibility
        const [activeRequests] = await db.query(`
            SELECT * FROM requests 
            WHERE user_id = ? 
            AND status IN ('approved_warden', 'generated', 'approved_hod')
            AND return_date > NOW() 
            ORDER BY created_at DESC LIMIT 1
        `, [studentId]);

        let activePass = activeRequests.length > 0 ? activeRequests[0] : null;

        // Special check: Day scholars with approved_hod are active. 
        // Hostel students with approved_hod are NOT active (waiting for warden).
        if (activePass && activePass.status === 'approved_hod' && user.student_type !== 'day_scholar') {
            activePass = null;
        }

        // 3. Fetch History (Last 10 completed/expired/rejected)
        const [history] = await db.query(`
            SELECT * FROM requests 
            WHERE user_id = ? 
            AND (status IN ('completed', 'rejected', 'cancelled') OR return_date <= NOW())
            ORDER BY created_at DESC 
            LIMIT 10
        `, [studentId]);

        res.json({
            identity: {
                name: user.name,
                reg_no: user.register_number,
                year: user.year,
                type: user.student_type,
                dept_id: user.department_id
            },
            activePass,
            history
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching wallet data' });
    }
};
