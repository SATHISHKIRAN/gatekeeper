const db = require('../config/database');
const { createNotification } = require('./notificationController');

exports.getStats = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        // ... (rest of getStats)


        const hod_id = req.user.id;

        // 1. Approval Metrics for this Dept
        const [[{ count: pendingCount }]] = await db.query(`
            SELECT COUNT(*) as count FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ? 
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
        `, [department_id]);

        const [[{ count: approvedCount }]] = await db.query(`
            SELECT COUNT(*) as count FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ? AND r.status IN ('approved_hod', 'approved_warden', 'generated', 'completed')
        `, [department_id]);

        // 2. Year-wise Student Mobility (In vs Out)
        const [yearStats] = await db.query(`
            SELECT 
                u.year,
                COUNT(u.id) as total,
                SUM(CASE WHEN r.status = 'generated' THEN 1 ELSE 0 END) as out_count
            FROM users u
            LEFT JOIN requests r ON u.id = r.user_id AND r.status = 'generated'
            WHERE u.department_id = ? AND u.role = 'student'
            GROUP BY u.year
        `, [department_id]);

        // 2.5 Student Mobility Summary (Global)
        const [[mobilityStats]] = await db.query(`
            SELECT 
                COUNT(*) as total_students,
                SUM(CASE WHEN r.status = 'generated' THEN 1 ELSE 0 END) as students_out,
                SUM(CASE WHEN r.status = 'generated' AND r.return_date < NOW() THEN 1 ELSE 0 END) as overdue_count
            FROM users u
            LEFT JOIN requests r ON u.id = r.user_id AND r.status = 'generated'
            WHERE u.department_id = ? AND u.role = 'student'
        `, [department_id]);

        const students_in = mobilityStats.total_students - mobilityStats.students_out;

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
            on_duty: staffPulse.filter(s => !s.leave_status).length,
            details: staffPulse.filter(s => s.leave_status) // list of staff on leave
        };

        // 4. Delegation Status & HOD Status
        let proxyStatus = null;
        let hodStatus = 'on_duty';

        const [proxyRows] = await db.query(`
            SELECT ps.*, u.name as proxy_name 
            FROM proxy_settings ps
            JOIN users u ON ps.proxy_id = u.id
            WHERE ps.hod_id = ? AND ps.is_active = TRUE
            LIMIT 1
        `, [hod_id]);

        if (proxyRows.length > 0) {
            proxyStatus = proxyRows[0];

            // Critical: Check if Assigned Proxy has conflicting leave dates with the Delegation Period
            // We consider it a conflict if the Proxy has ANY Approved Leave that overlaps with [Start, End] of delegation
            // OR if today is active and they are on leave today (which is a subset of the above)
            const [conflicts] = await db.query(`
                SELECT id, start_date, end_date, leave_type FROM staff_leaves 
                WHERE user_id = ? AND status = 'approved'
                AND (
                    (start_date BETWEEN ? AND ?) OR 
                    (end_date BETWEEN ? AND ?) OR
                    (start_date <= ? AND end_date >= ?)
                )
                LIMIT 1
            `, [
                proxyStatus.proxy_id,
                proxyStatus.start_date, proxyStatus.end_date,
                proxyStatus.start_date, proxyStatus.end_date,
                proxyStatus.start_date, proxyStatus.end_date
            ]);

            if (conflicts.length > 0) {
                proxyStatus.has_conflict = true;
                proxyStatus.conflict_details = `On Leave: ${new Date(conflicts[0].start_date).toLocaleDateString()} - ${new Date(conflicts[0].end_date).toLocaleDateString()}`;
            }
        }

        // Return explicit duty status for UI toggle
        res.json({
            pending: pendingCount || 0,
            approved: approvedCount || 0,
            yearStats,
            mobilityStats: {
                total: mobilityStats.total_students || 0,
                out: mobilityStats.students_out || 0,
                in: students_in || 0,
                overdue: mobilityStats.overdue_count || 0
            },
            staffStats,
            proxyStatus,
            hodStatus: hodStatus, // 'on_duty' | 'off_duty'
            department_name: req.user.department_name || 'Department'
        });
    } catch (error) {
        console.error('HOD Stats Error:', error);
        res.status(500).json({ message: 'Error fetching HOD stats' });
    }
};

exports.getStudentProfile = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const { id } = req.params;

        // Verify student belongs to HOD's department AND fetch enriched details
        const [[student]] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.year, u.student_type, u.trust_score, 
                    u.parent_phone, u.address, u.created_at, u.register_number, u.profile_image,
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

exports.getProfile = async (req, res) => {
    try {
        const hodId = req.user.id;
        const [users] = await db.query(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, u.profile_image, d.name as department_name
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    WHERE u.id = ?`,
            [hodId]
        );

        if (users.length === 0) return res.status(404).json({ message: 'HOD not found' });
        const user = users[0];

        // Dept stats
        const [[{ staff_count }]] = await db.query('SELECT COUNT(*) as staff_count FROM users WHERE department_id = ? AND role = "staff"', [user.department_id]);
        const [[{ student_count }]] = await db.query('SELECT COUNT(*) as student_count FROM users WHERE department_id = ? AND role = "student"', [user.department_id]);

        // Proxy status check
        const [proxy] = await db.query('SELECT * FROM proxy_settings WHERE hod_id = ? AND is_active = TRUE', [hodId]);

        res.json({
            user,
            stats: {
                staff_count,
                student_count,
                delegation_active: proxy.length > 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

exports.getDepartmentUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const department_id = req.user.department_id;

        let query = `
            SELECT u.id, u.name, u.email, u.role, u.trust_score, u.register_number, u.pass_blocked, u.cooldown_override_until, u.year, u.student_type, u.profile_image,
            (SELECT COUNT(*) FROM users u2 WHERE u2.mentor_id = u.id) as mentees_count,
            (SELECT COUNT(*) FROM users u3 WHERE u3.mentor_id = u.id AND u3.pass_blocked = 0) as active_mentees,
            (SELECT COUNT(*) FROM requests r WHERE r.user_id = u.id AND r.status = 'cancelled' AND r.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
             AND (u.cooldown_override_until IS NULL OR r.updated_at > u.cooldown_override_until)) as cooldown_count
            FROM users u
            WHERE u.department_id = ?
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

        // Modified: Approve both 'approved_staff' AND 'pending' (Escalation)
        await db.query(
            'UPDATE requests SET status = "approved_hod" WHERE id IN (?) AND status IN ("approved_staff", "pending")',
            [validIds]
        );

        for (const reqObj of requests) {
            // Log Action
            await db.query(
                'INSERT INTO staff_actions (staff_id, request_id, action_type, details) VALUES (?, ?, ?, ?)',
                [req.user.id, reqObj.id, 'approve_hod', JSON.stringify({ bulk: true })]
            );

            await createNotification(
                reqObj.user_id,
                'HOD Approval Granted',
                'Your request has been approved by the HOD and sent to Warden.',
                'success',
                '/profile',
                'request'
            );
        }

        // Notify Warden (Global or Hostel Specific - assuming global role 'warden' for now)
        // Ideally we should filter by Student's Hostel but for now notifying all Wardens is safer/guarantees delivery
        const { sendNotification } = require('./notificationController');
        await sendNotification(
            { role: 'warden' },
            {
                title: 'New HOD Approved Requests',
                message: `${validIds.length} requests have been approved by HOD and are ready for your review.`,
                type: 'info',
                category: 'request',
                link: '/warden/requests'
            }
        );

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
            'INSERT INTO requests (user_id, type, reason, departure_date, return_date, status, category) VALUES (?, "emergency", ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), DATE_ADD(NOW(), INTERVAL 1 DAY), "approved_hod", "critical")',
            [studentId, reason || "Medical Emergency Override by HOD"]
        );

        const rId = result.insertId;
        // Log Action
        await db.query(
            'INSERT INTO staff_actions (staff_id, request_id, action_type, details) VALUES (?, ?, ?, ?)',
            [req.user.id, rId, 'approve_hod', JSON.stringify({ reason: 'medical_override' })]
        );

        await createNotification(studentId, 'EMERGENCY PASS ISSUED! 🚨', 'HOD has issued a medical emergency override. Your pass is ready for exit.', 'error', null, 'request');

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
            `SELECT id, name, email, register_number, trust_score, pass_blocked, year, cooldown_override_until, profile_image,
             (SELECT COUNT(*) FROM requests r WHERE r.user_id = users.id AND r.status = 'cancelled' AND r.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
              AND (users.cooldown_override_until IS NULL OR r.updated_at > users.cooldown_override_until)) as cooldown_count
             FROM users WHERE id = ? AND department_id = ? AND role = "student"`,
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

        // 5. Check Active Pass (Is Student Outside?)
        const [[activePass]] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? AND status = "active"',
            [studentId]
        );

        res.json({
            student,
            history,
            stats,
            active_pass: activePass || null
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

        // 4. Fetch Mentees (New)
        const [mentees] = await db.query(
            'SELECT id, name, email, year, student_type, trust_score, pass_blocked, created_at FROM users WHERE mentor_id = ? AND role = "student"',
            [staffId]
        );

        // 5. Fetch Activity History (New)
        const [actions] = await db.query(
            `SELECT sa.*, r.reason as request_reason 
             FROM staff_actions sa 
             LEFT JOIN requests r ON sa.request_id = r.id
             WHERE sa.staff_id = ? 
             ORDER BY sa.timestamp DESC LIMIT 10`,
            [staffId]
        );

        const stats = {
            total_leaves: leaves.length,
            pending_leaves: leaves.filter(l => l.status === 'pending').length,
            approved_leaves: leaves.filter(l => l.status === 'approved').length,
            active_duty: leaves.some(l => l.status === 'approved' && new Date() >= new Date(l.start_date) && new Date() <= new Date(l.end_date)) ? 'On Leave' : 'On Duty',
            total_mentees: mentees.length,
            active_mentees: mentees.filter(m => !m.pass_blocked).length,
            approvals_logged: actions.filter(a => a.action_type === 'approve').length
        };

        res.json({
            member,
            leaves,
            mentees,
            history: actions,
            stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Workforce intelligence sync failed.' });
    }
};

exports.getHodRequests = async (req, res) => {
    try {
        const department_id = req.user.department_id;

        // 1. Actionable Requests (Escalated Pending + Staff Approved)
        const [actions] = await db.query(`
            SELECT r.*, u.name as student_name, u.register_number, u.year, u.mentor_id,
                CASE 
                    WHEN r.status = 'pending' THEN 'Escalated (Mentor on Leave)'
                    ELSE 'Staff Approved'
                END as approval_context
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ? 
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
            ORDER BY r.created_at ASC
        `, [department_id]);

        // 2. Full Registry (All passes in department history)
        const [registry] = await db.query(`
            SELECT r.*, u.name as student_name, u.register_number, u.year 
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE u.department_id = ? 
            ORDER BY r.created_at DESC 
            LIMIT 100
        `, [department_id]);

        res.json({ actions, registry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching HOD requests' });
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

        if (action === 'terminate') {
            await db.query('UPDATE staff_leaves SET end_date = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id = ?', [leaveId]);
            await createNotification(leaves[0].user_id, 'LEAVE ENDED EARLY ↩️', 'Your leave has been marked as completed by the HOD. You are back On Duty.', 'info');
            return res.json({ message: 'Leave terminated successfully. Staff is back On Duty.' });
        }

        if (action === 'cancelled') {
            await db.query('UPDATE staff_leaves SET status = ? WHERE id = ?', ['cancelled', leaveId]);
            await createNotification(leaves[0].user_id, 'LEAVE CANCELLED 🚫', 'Your leave application has been cancelled by the HOD.', 'error');
            return res.json({ message: 'Leave cancelled successfully.' });
        }

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
        // Check proxy staff status
        const [staff] = await db.query('SELECT status FROM users WHERE id = ?', [proxyId]);
        if (staff.length === 0) return res.status(404).json({ message: 'Staff member not found' });

        // Block if inactive or suspended
        if (staff[0].status === 'inactive' || staff[0].status === 'suspended') {
            return res.status(403).json({ message: `Cannot delegate authority to ${staff[0].status} staff member.` });
        }

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
        console.error('Set Proxy Error:', error);
        res.status(500).json({ message: 'Delegation failed: ' + error.message });
    }
};

exports.revokeProxy = async (req, res) => {
    const hodId = req.user.id;

    try {
        await db.query('UPDATE proxy_settings SET is_active = FALSE WHERE hod_id = ?', [hodId]);
        // Also unmark staff member
        // In a real app, we might need to look up who the proxy was, but simple UPDATE users SET is_proxy_active=FALSE WHERE id IN (SELECT proxy_id...) works too.
        // For now, simpler:
        await db.query('UPDATE users SET is_proxy_active = FALSE WHERE is_proxy_active = TRUE AND department_id = ?', [req.user.department_id]);

        res.json({ message: 'Delegation revoked. You are back in full command.' });
    } catch (error) {
        console.error('Revoke Proxy Error:', error);
        res.status(500).json({ message: 'Failed to revoke delegation.' });
    }
};

exports.toggleDuty = async (req, res) => {
    const hodId = req.user.id;
    const { status } = req.body; // 'on_duty' | 'off_duty'

    try {
        if (status === 'off_duty') {
            // Must have active proxy first
            const [proxy] = await db.query('SELECT * FROM proxy_settings WHERE hod_id = ? AND is_active = TRUE', [hodId]);
            if (proxy.length === 0) {
                return res.status(400).json({ message: 'ASSIGN ASSISISTED HOD FIRST! Cannot go off duty without delegation.' });
            }

            // Create open-ended leave (1 year for now, or until toggled back)
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = '2099-12-31'; // Indefinite

            await db.query(
                `INSERT INTO staff_leaves (user_id, leave_type, reason, start_date, end_date, status) 
                 VALUES (?, 'Off Duty', 'HOD Automatic Duty Toggle', ?, ?, 'approved')`,
                [hodId, startDate, endDate]
            );

            res.json({ message: 'You are now OFF DUTY. Responsibilities delegated.' });

        } else {
            // Going On Duty -> Terminate all active leaves
            await db.query(`
                UPDATE staff_leaves 
                SET end_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) 
                WHERE user_id = ? AND status = 'approved' AND end_date >= CURDATE()
            `, [hodId]);

            res.json({ message: 'You are now ON DUTY.' });
        }
    } catch (error) {
        console.error('Toggle Duty Error:', error);
        res.status(500).json({ message: 'Failed to update duty status.' });
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
        await createNotification(studentId, 'TRUST SCORE UPDATED 🛡️', `Your trust score has been updated to ${score}% by the HOD.`, 'info', null, 'request');

        res.json({ message: `Trust score updated to ${score}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update trust score.' });
    }
};

exports.resetCooldown = async (req, res) => {
    const { userId } = req.body;
    const department_id = req.user.department_id;

    try {
        // Verify student is in HOD's department
        const [users] = await db.query('SELECT name FROM users WHERE id = ? AND department_id = ? AND role = "student"', [userId, department_id]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found in your department.' });

        // Reset cooldown by setting override to NOW()
        await db.query('UPDATE users SET cooldown_override_until = NOW() WHERE id = ?', [userId]);

        await createNotification(userId, 'COOL-DOWN REMOVED 🔓', 'Your cancellation cool-down has been manually removed by the HOD. You can now apply for passes.', 'success', null, 'request');

        res.json({ message: 'Cool-down reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting cool-down' });
    }
};

// --- Medical Override Management ---

exports.getMedicalOverrides = async (req, res) => {
    const department_id = req.user.department_id;
    try {
        // Fetch all generated emergency passes (critical category or emergency type approved by HOD)
        const [overrides] = await db.query(`
            SELECT r.*, u.name as student_name, u.register_number, u.email as student_email 
            FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE u.department_id = ? 
            AND (r.category = 'critical' OR (r.type = 'emergency' AND r.status = 'approved_hod'))
            ORDER BY r.created_at DESC
        `, [department_id]);

        res.json(overrides);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch medical overrides.' });
    }
};

exports.updateMedicalOverride = async (req, res) => {
    const { id } = req.params;
    const { reason, departure_date, return_date } = req.body;
    const department_id = req.user.department_id;

    try {
        // Verify ownership and valid status
        const [reqs] = await db.query(`
            SELECT r.id FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ? AND u.department_id = ?
        `, [id, department_id]);

        if (reqs.length === 0) return res.status(404).json({ message: 'Request not found or unauthorized.' });

        await db.query(
            'UPDATE requests SET reason = ?, departure_date = ?, return_date = ? WHERE id = ?',
            [reason, departure_date, return_date, id]
        );

        res.json({ message: 'Override details updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Update failed.' });
    }
};

exports.deleteMedicalOverride = async (req, res) => {
    const { id } = req.params;
    const department_id = req.user.department_id;

    try {
        // Verify ownership
        const [reqs] = await db.query(`
            SELECT r.id, r.user_id FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ? AND u.department_id = ?
        `, [id, department_id]);

        if (reqs.length === 0) return res.status(404).json({ message: 'Request not found or unauthorized.' });

        const reqToDelete = reqs[0];

        // Soft delete (cancel)
        await db.query('UPDATE requests SET status = "cancelled" WHERE id = ?', [id]);

        await createNotification(reqToDelete.user_id, 'PASS REVOKED 🚫', 'Your medical override pass has been revoked by the HOD.', 'error');

        res.json({ message: 'Request cancelled successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Cancellation failed.' });
    }
};



exports.getAdvancedReports = async (req, res) => {
    try {
        const department_id = req.user.department_id;
        const { startDate, endDate, status, year, studentType } = req.query;

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
            WHERE u.department_id = ?
        `;

        const params = [department_id];

        if (startDate && endDate) {
            query += ` AND r.created_at BETWEEN ? AND ?`;
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        }

        if (status) { // e.g., 'approved,pending,rejected'
            const statusArray = status.split(',');
            // Handle wildcard or 'all' logic if needed, but array check is safer
            if (statusArray.length > 0) {
                query += ` AND r.status IN (?)`;
                params.push(statusArray);
            }
        }

        if (year) { // e.g., '1,2,3'
            const yearArray = year.split(',');
            if (yearArray.length > 0) {
                query += ` AND u.year IN (?)`;
                params.push(yearArray);
            }
        }

        if (studentType) { // 'Day Scholar' or 'Hosteler'
            query += ` AND u.student_type = ?`;
            params.push(studentType);
        }

        query += ` ORDER BY r.created_at DESC`;

        const [results] = await db.query(query, params);

        res.json(results);
    } catch (error) {
        console.error('Reports Error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};
