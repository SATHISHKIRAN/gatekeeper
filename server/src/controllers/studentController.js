const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Fetch user details with Mentor, Hostel, Room, and Warden info aliased
        const [users] = await db.query(`
            SELECT 
                u.id, u.name, u.email, u.role, u.department_id, u.trust_score, 
                u.student_type, u.register_number, u.year, u.phone, u.status, u.profile_image,
                m.name as mentor_name, 
                m.email as mentor_email, 
                m.phone as mentor_phone, 
                m.register_number as mentor_register_number,
                h.name as hostel_name,
                r.room_number,
                w.name as warden_name,
                w.email as warden_email,
                w.phone as warden_phone,
                w.register_number as warden_register_number
            FROM users u
            LEFT JOIN users m ON u.mentor_id = m.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN rooms r ON u.room_id = r.id
            LEFT JOIN users w ON h.warden_id = w.id
            WHERE u.id = ?
        `, [studentId]);

        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = users[0];

        // Check if mentor is on leave
        let mentorOnLeave = false;
        if (user.mentor_id) {
            const [leaves] = await db.query(
                `SELECT * FROM staff_leaves 
                 WHERE user_id = ? AND status = 'approved' 
                 AND CURDATE() BETWEEN start_date AND end_date`,
                [user.mentor_id]
            );
            if (leaves.length > 0) mentorOnLeave = true;
        }

        // Construct profile data
        let profileData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department_id: user.department_id,
            trust_score: user.trust_score,
            student_type: user.student_type,
            register_number: user.register_number,
            year: user.year,
            phone: user.phone,
            profile_image: user.profile_image,
            status: user.status || 'Active', // Default to Active if null
            mentor_name: user.mentor_name,
            mentor_email: user.mentor_email,
            mentor_phone: user.mentor_phone,
            mentor_register_number: user.mentor_register_number,
            mentor_on_leave: mentorOnLeave, // New Field
            hostel_details: {
                hostel_name: user.hostel_name || 'Not assigned',
                room_number: user.room_number || 'N/A',
                warden_name: user.warden_name || 'N/A',
                warden_email: user.warden_email,
                warden_phone: user.warden_phone,
                warden_register_number: user.warden_register_number
            }
        };

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
