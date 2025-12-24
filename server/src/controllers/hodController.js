const db = require('../config/database');
const { createNotification } = require('./notificationController');

exports.getStats = async (req, res) => {
    try {
        const department_id = req.user.department_id;

        // 1. Approval Metrics for this Dept
        const [[{ pending }]] = await db.query(`
            SELECT COUNT(*) as count FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ? AND r.status IN ('pending', 'approved_staff')
        `, [department_id]);

        const [[{ approved }]] = await db.query(`
            SELECT COUNT(*) as count FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ? AND r.status IN ('approved_hod', 'approved_warden', 'generated', 'completed')
        `, [department_id]);

        // 2. Year-wise Student Mobility (In vs Out)
        const [yearStats] = await db.query(`
            SELECT 
                u.year,
                COUNT(u.id) as total,
                SUM(CASE WHEN r.id IS NOT NULL AND l.action = 'exit' AND l.id = (
                    SELECT id FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1
                ) THEN 1 ELSE 0 END) as out_count
            FROM users u
            LEFT JOIN requests r ON u.id = r.user_id AND r.status = 'generated'
            LEFT JOIN logs l ON r.id = l.request_id
            WHERE u.department_id = ? AND u.role = 'student'
            GROUP BY u.year
        `, [department_id]);

        // 3. Staff Duty vs Leave Pulse
        const [staffPulse] = await db.query(`
            SELECT 
                u.id, u.name,
                (SELECT status FROM staff_leaves 
                 WHERE user_id = u.id AND status = 'approved' 
                 AND CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1) as leave_status
            FROM users u
            WHERE u.department_id = ? AND u.role = 'staff'
        `, [department_id]);

        const staffStats = {
            total: staffPulse.length,
            on_leave: staffPulse.filter(s => s.leave_status).length,
            on_duty: staffPulse.filter(s => !s.leave_status).length
        };

        // 4. Delegation Status
        const [[proxyStatus]] = await db.query(`
            SELECT ps.*, u.name as proxy_name 
            FROM proxy_settings ps
            JOIN users u ON ps.proxy_id = u.id
            WHERE ps.hod_id = ? AND ps.is_active = TRUE
            LIMIT 1
        `, [req.user.id]);

        res.json({
            pending,
            approved,
            yearStats,
            staffStats,
            proxyStatus,
            department_name: req.user.department_name || 'Department'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching HOD stats' });
    }
};

exports.getDepartmentUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const department_id = req.user.department_id;

        let query = `
            SELECT id, name, email, role, trust_score, register_number, pass_blocked,
            (SELECT COUNT(*) FROM users u2 WHERE u2.mentor_id = users.id) as mentees_count,
            (SELECT COUNT(*) FROM users u3 WHERE u3.mentor_id = users.id AND u3.pass_blocked = 0) as active_mentees
            FROM users 
            WHERE department_id = ?
        `;
        let params = [department_id];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching department users' });
    }
};

exports.getUnassignedStudents = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const [students] = await db.query(
            'SELECT id, name, email, register_number, year, student_type FROM users WHERE department_id = ? AND role = "student" AND mentor_id IS NULL',
            [department_id]
        );
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unassigned students' });
    }
};

exports.assignMentees = async (req, res) => {
    const { staffId, studentIds } = req.body;
    const department_id = req.user.department_id; // Security check context

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'No students selected for assignment' });
    }

    try {
        // Validation: Verify staff is in dept
        const [staff] = await db.query('SELECT id FROM users WHERE id = ? AND department_id = ? AND role = "staff"', [staffId, department_id]);
        if (staff.length === 0) return res.status(403).json({ message: 'Target staff not found in your department' });

        // Update students
        await db.query(
            'UPDATE users SET mentor_id = ? WHERE id IN (?) AND department_id = ?',
            [staffId, studentIds, department_id]
        );

        res.json({ message: `Successfully assigned ${studentIds.length} students to mentor.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Assignment failed' });
    }
};

exports.getStaffMentees = async (req, res) => {
    try {
        const { id } = req.params;
        const department_id = req.user.department_id;

        const [mentees] = await db.query(
            'SELECT id, name, email, register_number, year, student_type, trust_score FROM users WHERE mentor_id = ? AND department_id = ?',
            [id, department_id]
        );
        res.json(mentees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching mentees' });
    }
};

exports.unassignMentees = async (req, res) => {
    const { studentIds } = req.body;
    const department_id = req.user.department_id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'No students selected' });
    }

    try {
        await db.query(
            'UPDATE users SET mentor_id = NULL WHERE id IN (?) AND department_id = ?',
            [studentIds, department_id]
        );
        res.json({ message: `Unassigned ${studentIds.length} students.` });
    } catch (error) {
        res.status(500).json({ message: 'Unassignment failed' });
    }
};

exports.bulkApprove = async (req, res) => {
    const { requestIds } = req.body;
    const department_id = req.user.department_id;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ message: 'No requests selected' });
    }

    try {
        // Ensure HOD can only approve requests from their own department
        const [requests] = await db.query(`
            SELECT r.id, r.user_id FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id IN (?) AND u.department_id = ?
        `, [requestIds, department_id]);

        const validIds = requests.map(r => r.id);

        if (validIds.length === 0) {
            return res.status(403).json({ message: 'No valid requests found for your department.' });
        }

        await db.query(
            'UPDATE requests SET status = "approved_hod" WHERE id IN (?) AND status IN ("pending", "approved_staff")',
            [validIds]
        );

        for (const reqObj of requests) {
            await createNotification(
                reqObj.user_id,
                'HOD Approval Granted',
                'Your request has been approved by the HOD and sent to Warden.',
                'success',
                '/profile'
            );
        }

        res.json({ message: `Approved ${validIds.length} requests.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.medicalOverride = async (req, res) => {
    const { studentEmail, reason } = req.body;
    const department_id = req.user.department_id;

    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ? AND role = "student" AND department_id = ?', [studentEmail, department_id]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found in your department' });

        const studentId = users[0].id;

        const [result] = await db.query(
            'INSERT INTO requests (user_id, type, reason, departure_date, return_date, status) VALUES (?, "emergency", ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), "approved_warden")',
            [studentId, reason || "Medical Emergency Override by HOD"]
        );

        await createNotification(studentId, 'EMERGENCY PASS ISSUED! 🚨', 'HOD has issued a medical emergency override. Your QR pass is ready for immediate exit.', 'error');

        res.json({ message: 'Emergency pass authorized.', requestId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getRestrictions = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const [restrictions] = await db.query('SELECT * FROM pass_restrictions WHERE department_id = ?', [department_id]);
        res.json(restrictions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching restrictions' });
    }
};

exports.toggleIndividualBlock = async (req, res) => {
    const { userId, blocked } = req.body;
    const department_id = req.user.department_id;

    try {
        const [result] = await db.query(
            'UPDATE users SET pass_blocked = ? WHERE id = ? AND department_id = ? AND role = "student"',
            [blocked, userId, department_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found in your department' });
        }

        res.json({ message: `Student pass status updated to ${blocked ? 'BLOCKED' : 'UNBLOCKED'}.` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating block status' });
    }
};

exports.manageYearRestriction = async (req, res) => {
    const { academic_year, action, reason } = req.body; // action: 'block' | 'unblock'
    const department_id = req.user.department_id;

    try {
        if (action === 'block') {
            await db.query(
                'INSERT INTO pass_restrictions (department_id, academic_year, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?',
                [department_id, academic_year, reason, reason]
            );
            res.json({ message: `Access restricted for all ${academic_year} students.` });
        } else {
            await db.query(
                'DELETE FROM pass_restrictions WHERE department_id = ? AND academic_year = ?',
                [department_id, academic_year]
            );
            res.json({ message: `Access restored for all ${academic_year} students.` });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error managing year restriction' });
    }
};

exports.getStudentProfiler = async (req, res) => {
    const studentId = req.params.id;
    const department_id = req.user.department_id;

    try {
        // 1. Fetch Student Identity
        const [users] = await db.query(
            'SELECT id, name, email, register_number, trust_score, pass_blocked, year FROM users WHERE id = ? AND department_id = ? AND role = "student"',
            [studentId, department_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Student metadata not found in your department node.' });
        }

        const student = users[0];

        // 2. Fetch Mobility History
        const [history] = await db.query(
            'SELECT id, type, status, reason, departure_date, return_date, created_at FROM requests WHERE user_id = ? ORDER BY created_at DESC',
            [studentId]
        );

        // 3. Fetch Last Pulse (Last Exit Log)
        const [[lastPulse]] = await db.query(`
            SELECT l.timestamp, l.action 
            FROM logs l
            JOIN requests r ON l.request_id = r.id
            WHERE r.user_id = ?
            ORDER BY l.timestamp DESC LIMIT 1
        `, [studentId]);

        // 4. Aggregate Intelligence
        const stats = {
            total_requests: history.length,
            approved: history.filter(r => ['approved_hod', 'approved_warden', 'generated', 'completed'].includes(r.status)).length,
            rejected: history.filter(r => r.status === 'rejected').length,
            last_activity: lastPulse || null
        };

        res.json({
            student,
            history,
            stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Intelligence synchronization failed.' });
    }
};

exports.getStaffProfiler = async (req, res) => {
    const staffId = req.params.id;
    const department_id = req.user.department_id;

    try {
        // 1. Fetch Staff Identity
        const [users] = await db.query(
            'SELECT id, name, email, department_id FROM users WHERE id = ? AND department_id = ? AND role = "staff"',
            [staffId, department_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Staff identity not found in your department node.' });
        }

        const member = users[0];

        // 2. Fetch Work Intelligence (Approvals Given)
        const [[{ approvals_given }]] = await db.query(`
            SELECT COUNT(*) as count FROM requests 
            WHERE status != 'pending' AND user_id IN (
                SELECT id FROM users WHERE department_id = ?
            )
            -- This is a bit complex since requests don't track WHO approved them specifically in the main table
            -- Assuming staff only approves for their own department and we can track logs
        `, [department_id]);

        // Actually, let's just count how many times this staff's ID appears in logs (if we had staff_id there)
        // For now, let's provide basic identity and leave stats.

        // 3. Fetch Leave Stats
        const [leaves] = await db.query(
            'SELECT * FROM staff_leaves WHERE user_id = ? ORDER BY created_at DESC',
            [staffId]
        );

        const stats = {
            total_leaves: leaves.length,
            pending_leaves: leaves.filter(l => l.status === 'pending').length,
            approved_leaves: leaves.filter(l => l.status === 'approved').length,
            active_duty: leaves.some(l => l.status === 'approved' && new Date() >= new Date(l.start_date) && new Date() <= new Date(l.end_date)) ? 'On Leave' : 'On Duty'
        };

        res.json({
            member,
            leaves,
            stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Workforce intelligence sync failed.' });
    }
};

exports.addStaffLeave = async (req, res) => {
    const { staffId, leave_type, reason, start_date, end_date } = req.body;
    const department_id = req.user.department_id;

    try {
        // Verify staff belongs to HOD's department
        const [users] = await db.query('SELECT id FROM users WHERE id = ? AND department_id = ? AND role = "staff"', [staffId, department_id]);
        if (users.length === 0) return res.status(403).json({ message: 'Unauthorized: Staff node mismatch.' });

        await db.query(
            'INSERT INTO staff_leaves (user_id, leave_type, reason, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, "approved")',
            [staffId, leave_type, reason, start_date, end_date]
        );

        await createNotification(staffId, 'LEAVE REGISTERED 🗓️', `HOD has officially registered your ${leave_type} from ${start_date} to ${end_date}.`, 'info');

        res.json({ message: 'Leave registry updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update leave registry.' });
    }
};

exports.manageStaffLeave = async (req, res) => {
    const { leaveId, action } = req.body; // action: 'approved' | 'rejected'
    const department_id = req.user.department_id;

    try {
        // Verify leave belongs to staff in HOD's department
        const [leaves] = await db.query(`
            SELECT sl.id, sl.user_id FROM staff_leaves sl
            JOIN users u ON sl.user_id = u.id
            WHERE sl.id = ? AND u.department_id = ?
        `, [leaveId, department_id]);

        if (leaves.length === 0) return res.status(403).json({ message: 'Leave record not found in your department.' });

        await db.query('UPDATE staff_leaves SET status = ? WHERE id = ?', [action, leaveId]);

        const statusIcon = action === 'approved' ? '✅' : '❌';
        await createNotification(leaves[0].user_id, `Leave ${action.toUpperCase()}`, `Your leave application has been ${action} by the HOD. ${statusIcon}`, action === 'approved' ? 'success' : 'error');

        res.json({ message: `Leave status updated to ${action}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to synchronize leave status.' });
    }
};

exports.setProxy = async (req, res) => {
    const { proxyId, startDate, endDate } = req.body;
    const hodId = req.user.id;

    try {
        // Deactivate any existing proxy for this HOD
        await db.query('UPDATE proxy_settings SET is_active = FALSE WHERE hod_id = ?', [hodId]);

        // Create new proxy setting
        await db.query(
            'INSERT INTO proxy_settings (hod_id, proxy_id, start_date, end_date, is_active) VALUES (?, ?, ?, ?, TRUE)',
            [hodId, proxyId, startDate, endDate]
        );

        // Mark staff member as proxy active
        await db.query('UPDATE users SET is_proxy_active = TRUE WHERE id = ?', [proxyId]);

        await createNotification(proxyId, 'DELEGATION ACTIVE 🛡️', `You have been assigned as the Assistant HOD for the department until ${endDate}.`, 'success');

        res.json({ message: 'Assistant HOD assigned successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Delegation failed.' });
    }
};

exports.revokeProxy = async (req, res) => {
    const hodId = req.user.id;

    try {
        // Find active proxy first to get the proxyId
        const [proxies] = await db.query('SELECT proxy_id FROM proxy_settings WHERE hod_id = ? AND is_active = TRUE', [hodId]);

        if (proxies.length === 0) {
            return res.status(404).json({ message: 'No active delegation found.' });
        }

        const proxyId = proxies[0].proxy_id;

        // Deactivate proxy settings
        await db.query('UPDATE proxy_settings SET is_active = FALSE WHERE hod_id = ? AND is_active = TRUE', [hodId]);

        // Reset user proxy status
        await db.query('UPDATE users SET is_proxy_active = FALSE WHERE id = ?', [proxyId]);

        await createNotification(proxyId, 'DELEGATION REVOKED 🔓', 'Your status as Assistant HOD has been revoked by the HOD.', 'info');

        res.json({ message: 'Delegation revoked successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Revocation failed.' });
    }
};

exports.forwardRequests = async (req, res) => {
    const { requestIds, assistantId } = req.body;
    const department_id = req.user.department_id;

    try {
        await db.query(
            'UPDATE requests SET forwarded_to = ? WHERE id IN (?) AND status IN ("pending", "approved_staff")',
            [assistantId, requestIds]
        );

        await createNotification(assistantId, 'REQUESTS FORWARDED 📨', `${requestIds.length} pass requests have been forwarded to you for immediate review.`, 'info');

        res.json({ message: `Forwarded ${requestIds.length} requests to Assistant HOD.` });
    } catch (error) {
        res.status(500).json({ message: 'Forwarding failed.' });
    }
};

exports.updateTrustScore = async (req, res) => {
    const { studentId, score } = req.body;
    const department_id = req.user.department_id;
    const hodId = req.user.id; // Corrected: Using hodId from token

    if (score < 0 || score > 100) {
        return res.status(400).json({ message: 'Trust score must be between 0 and 100.' });
    }

    try {
        // Verify student is in HOD's department
        const [users] = await db.query('SELECT id, trust_score, name FROM users WHERE id = ? AND department_id = ? AND role = "student"', [studentId, department_id]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found in your department.' });

        const student = users[0];
        const oldScore = student.trust_score;

        // Update Trust Score
        await db.query('UPDATE users SET trust_score = ? WHERE id = ?', [score, studentId]);

        // Log the change
        const reason = `Manual adjustment by HOD (from ${oldScore} to ${score})`;
        await db.query('INSERT INTO trust_history (user_id, changed_by, old_score, new_score, reason) VALUES (?, ?, ?, ?, ?)', [studentId, hodId, oldScore, score, reason]);

        // Notify Student
        await createNotification(studentId, 'TRUST SCORE UPDATED 🛡️', `Your trust score has been updated to ${score}% by the HOD.`, 'info');

        res.json({ message: `Trust score updated to ${score}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update trust score.' });
    }
};
