const db = require('../config/database');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

exports.getGlobalStats = async (req, res) => {
    try {
        // 1. Basic Counts
        const [[{ count: total_students }]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [[{ count: total_requests }]] = await db.query('SELECT COUNT(*) as count FROM requests');
        const [[{ count: active_passes }]] = await db.query(`
            SELECT COUNT(r.id) as count FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE (
                (u.student_type = 'Day Scholar' AND r.status = 'approved_hod') 
                OR (u.student_type = 'Hostel' AND r.status = 'approved_warden')
                OR (r.status = 'completed' AND r.updated_at >= DATE_SUB(NOW(), INTERVAL 1 DAY))
                OR (r.status = 'pending')
            )
        `);

        // 2. Departmental Analytics (Outings per Department)
        const [department_stats] = await db.query(`
            SELECT d.name, COUNT(r.id) as value 
            FROM departments d 
            LEFT JOIN users u ON u.department_id = d.id 
            LEFT JOIN requests r ON r.user_id = u.id 
            GROUP BY d.id
        `);

        // 3. Weekly Trends (Last 7 Days)
        const [weekly_trends] = await db.query(`
            SELECT DATE(r.created_at) as date, COUNT(r.id) as count 
            FROM requests r
            WHERE r.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            GROUP BY DATE(r.created_at)
            ORDER BY date
        `);

        // 4. Request Type Distribution
        const [type_distribution] = await db.query(`
            SELECT r.type as name, COUNT(r.id) as value 
            FROM requests r
            GROUP BY r.type
        `);

        // 5. Hourly Activity (Last 24 Hours)
        const [hourly_activity] = await db.query(`
            SELECT HOUR(l.timestamp) as hour, l.action, COUNT(l.id) as count 
            FROM logs l
            WHERE l.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
            GROUP BY HOUR(l.timestamp), l.action
            ORDER BY hour
        `);

        // 6. Hostel Occupancy (Aggregated)
        const [[hostel_stats]] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM rooms WHERE status = 'occupied') as occupied,
                (SELECT COUNT(*) FROM rooms WHERE status = 'available') as available,
                (SELECT COUNT(*) FROM rooms WHERE status = 'maintenance') as maintenance
        `);

        res.json({
            summary: {
                total_students,
                total_requests,
                active_passes,
                system_health: 'Optimal'
            },
            department_stats,
            weekly_trends,
            type_distribution,
            hourly_activity,
            hostel_stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const adminId = req.user.id;
        const [users] = await db.query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [adminId]);

        if (users.length === 0) return res.status(404).json({ message: 'Admin not found' });
        const admin = users[0];

        // Fetch System Health Stats for Profile
        const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users');
        const [[{ total_requests }]] = await db.query('SELECT COUNT(*) as total_requests FROM requests');
        const [[{ active_issues }]] = await db.query('SELECT COUNT(*) as active_issues FROM requests WHERE status = "pending"');

        res.json({
            user: admin,
            stats: {
                total_users,
                total_requests,
                active_issues,
                system_status: 'Operational'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching admin profile' });
    }
};

// --- User Management ---
exports.getAllUsers = async (req, res) => {
    try {
        const { role, department_id } = req.query;
        let query = 'SELECT u.*, d.name as department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id';
        let params = [];

        if (role || department_id) {
            query += ' WHERE';
            if (role) {
                query += ' u.role = ?';
                params.push(role);
            }
            if (department_id) {
                if (role) query += ' AND';
                query += ' u.department_id = ?';
                params.push(department_id);
            }
        }

        query += ' ORDER BY u.created_at DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

exports.getHostels = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, type FROM hostels ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching hostels' });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password, role, department_id, phone, year, register_number, hostel_id } = req.body;
    let { student_type } = req.body;

    // Normalize student_type
    if (student_type && student_type.toLowerCase() === 'hostel') student_type = 'Hostel';
    if (student_type && student_type.toLowerCase().includes('day')) student_type = 'Day Scholar';

    const profile_image = req.file ? req.file.filename : null;

    try {
        const password_hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password_hash, role, department_id, phone, year, register_number, status, student_type, hostel_id, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", ?, ?, ?)',
            [name, email, password_hash, role, department_id, phone, year, register_number, student_type, hostel_id || null, profile_image]
        );
        res.json({ message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already registered' });
        }
        res.status(500).json({ message: 'Error creating user', error: error.message, stack: error.stack });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, role, department_id, trust_score, status, phone, year, register_number, email, student_type, hostel_id } = req.body;
    const remove_profile_image = req.body.remove_profile_image === 'true'; // Check string 'true' from FormData
    const profile_image = req.file ? req.file.filename : undefined;

    try {
        // Fetch current user data (for trust score and old image)
        const [[currentUser]] = await db.query('SELECT trust_score, profile_image, role FROM users WHERE id = ?', [id]);

        let updateQuery = 'UPDATE users SET name = ?, role = ?, department_id = ?, trust_score = ?, status = ?, phone = ?, year = ?, register_number = ?, email = ?, student_type = ?, hostel_id = ?';
        let queryParams = [name, role, department_id, trust_score, status, phone, year, register_number, email, student_type, hostel_id || null];

        const getOldImagePath = (imageName, userRole) => {
            const baseDir = ['staff', 'hod', 'warden', 'gatekeeper', 'admin', 'principal'].includes(userRole)
                ? 'c:\\Users\\mahesh-13145\\Downloads\\sk\\gate\\client\\public\\img\\staff'
                : 'c:\\Users\\mahesh-13145\\Downloads\\sk\\gate\\client\\public\\img\\student';
            return path.join(baseDir, imageName);
        };


        // Logic for image update/removal
        if (profile_image) {
            // New image uploaded
            updateQuery += ', profile_image = ?';
            queryParams.push(profile_image);

            // Delete old image if exists
            if (currentUser.profile_image) {
                const oldPath = getOldImagePath(currentUser.profile_image, currentUser.role);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } else if (remove_profile_image) {
            // Explicit removal requested
            updateQuery += ', profile_image = NULL';

            // Delete old image if exists
            if (currentUser.profile_image) {
                const oldPath = getOldImagePath(currentUser.profile_image, currentUser.role);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        updateQuery += ' WHERE id = ?';
        queryParams.push(id);

        await db.query(updateQuery, queryParams);

        // Auto-log trust score change
        if (currentUser && currentUser.trust_score != trust_score) {
            await db.query(
                'INSERT INTO trust_history (user_id, old_score, new_score, reason) VALUES (?, ?, ?, ?)',
                [id, currentUser.trust_score, trust_score, 'Admin manual update']
            );
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        // 1. Get user's profile image and role
        const [users] = await db.query('SELECT profile_image, role FROM users WHERE id = ?', [req.params.id]);

        if (users.length > 0) {
            const { profile_image, role } = users[0];
            if (profile_image) {
                const baseDir = ['staff', 'hod', 'warden', 'gatekeeper', 'admin', 'principal'].includes(role)
                    ? 'c:\\Users\\mahesh-13145\\Downloads\\sk\\gate\\client\\public\\img\\staff'
                    : 'c:\\Users\\mahesh-13145\\Downloads\\sk\\gate\\client\\public\\img\\student';

                const imagePath = path.join(baseDir, profile_image);
                // 2. Delete file if exists
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        }

        // 3. Delete user record
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User and associated data deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

exports.resetUserPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        const password_hash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

exports.getStudentOversight = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch Student Identity
        const [studentRows] = await db.query(`
            SELECT u.*, d.name as department_name, h.name as hostel_name 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE u.id = ?
        `, [id]);

        const student = studentRows[0];
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // 2. Trust History
        const [trustHistory] = await db.query('SELECT th.* FROM trust_history th WHERE th.user_id = ? ORDER BY th.created_at DESC', [id]);

        // 3. Mobility History
        const [mobilityLogs] = await db.query(`
            SELECT l.*, r.type as request_type 
            FROM logs l 
            JOIN requests r ON l.request_id = r.id 
            WHERE r.user_id = ? AND l.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY l.timestamp DESC
        `, [id]);

        // 4. Request History
        const [requests] = await db.query(`
            SELECT r.* FROM requests r
            WHERE r.user_id = ? 
            ORDER BY r.created_at DESC 
            LIMIT 50
        `, [id]);

        // 5. Pass Statistics
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(r.id) as total_passes,
                COALESCE(SUM(CASE WHEN LOWER(r.status) = 'completed' THEN 1 ELSE 0 END), 0) as completed,
                COALESCE(SUM(CASE WHEN LOWER(r.status) = 'rejected' THEN 1 ELSE 0 END), 0) as rejected,
                COALESCE(SUM(CASE 
                    WHEN (LOWER(?) LIKE '%day%' AND LOWER(r.status) = 'approved_hod') 
                    OR (LOWER(?) = 'hostel' AND LOWER(r.status) = 'approved_warden') 
                    THEN 1 ELSE 0 END), 0) as active
            FROM requests r
            WHERE r.user_id = ?
        `, [student.student_type || '', student.student_type || '', id]);

        const stats = statsRows[0] || { total_passes: 0, completed: 0, rejected: 0, active: 0 };

        res.json({
            student,
            trustHistory: trustHistory || [],
            mobilityLogs: mobilityLogs || [],
            requests: requests || [],
            stats
        });
    } catch (error) {
        console.error(`[ERROR] Oversight failed for student ID ${id}:`, error);
        res.status(500).json({
            message: 'Oversight sync failed',
            error: error.message,
            sql: error.sql
        });
    }
};

// --- Department Management ---
exports.getDepartments = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                d.*,
                u.name as hod_name,
                (SELECT COUNT(*) FROM users u2 WHERE u2.department_id = d.id AND u2.role = 'student') as student_count,
                (SELECT COUNT(*) FROM users u2 WHERE u2.department_id = d.id AND u2.role != 'student') as staff_count,
                (SELECT COUNT(*) FROM pass_restrictions pr WHERE pr.department_id = d.id) as restriction_count
            FROM departments d
            LEFT JOIN users u ON d.hod_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching departments' });
    }
};

exports.createDepartment = async (req, res) => {
    const { name, description } = req.body;
    try {
        await db.query('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description]);
        res.json({ message: 'Department created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating department' });
    }
};

exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, description, hod_id } = req.body;
    try {
        await db.query(
            'UPDATE departments SET name = ?, description = ?, hod_id = ? WHERE id = ?',
            [name, description, hod_id || null, id]
        );
        res.json({ message: 'Department updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating department' });
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
        // Optional: Check if department has users before deleting?
        // For now, consistent with user request, we try to delete.
        // If there are FK constraints, this might fail, so we catch it.
        await db.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete department. There are still users or restrictions assigned to it.' });
        }
        res.status(500).json({ message: 'Error deleting department' });
    }
};

exports.assignHOD = async (req, res) => {
    const { id } = req.params;
    const { hod_id } = req.body;
    try {
        await db.query('UPDATE departments SET hod_id = ? WHERE id = ?', [hod_id, id]);
        res.json({ message: 'HOD assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error assigning HOD' });
    }
};

exports.removeHOD = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE departments SET hod_id = NULL WHERE id = ?', [id]);
        res.json({ message: 'HOD removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing HOD' });
    }
};

// --- Hub 3.0 Backend Connectivity ---

exports.getDepartmentUsers = async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await db.query(`
            SELECT id, name, email, role, student_type, year, status, trust_score 
            FROM users 
            WHERE department_id = ?
            ORDER BY role, name
        `, [id]);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching departmental roster' });
    }
};

exports.getDepartmentDetailedStats = async (req, res) => {
    try {
        // student distribution
        const [distribution] = await db.query(`
            SELECT d.name, COUNT(u.id) as value 
            FROM departments d 
            LEFT JOIN users u ON u.department_id = d.id AND u.role = 'student'
            GROUP BY d.id
        `);

        // restriction status
        const [restrictions] = await db.query(`
            SELECT d.name, COUNT(pr.id) as restriction_count
            FROM departments d
            LEFT JOIN pass_restrictions pr ON pr.department_id = d.id
            GROUP BY d.id
        `);

        res.json({ distribution, restrictions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
};

// --- Pass Restrictions Management ---
exports.getPassRestrictions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT pr.*, d.name as department_name 
            FROM pass_restrictions pr 
            JOIN departments d ON pr.department_id = d.id
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching restrictions' });
    }
};

exports.addPassRestriction = async (req, res) => {
    const { department_id, academic_year, reason } = req.body;
    try {
        await db.query(
            'INSERT INTO pass_restrictions (department_id, academic_year, reason) VALUES (?, ?, ?)',
            [department_id, academic_year, reason]
        );
        res.json({ message: 'Restriction added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding restriction' });
    }
};

exports.updatePassRestriction = async (req, res) => {
    const { id } = req.params;
    const { department_id, academic_year, reason } = req.body;
    try {
        await db.query(
            'UPDATE pass_restrictions SET department_id = ?, academic_year = ?, reason = ? WHERE id = ?',
            [department_id, academic_year, reason, id]
        );
        res.json({ message: 'Restriction updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating restriction' });
    }
};

exports.removePassRestriction = async (req, res) => {
    try {
        await db.query('DELETE FROM pass_restrictions WHERE id = ?', [req.params.id]);
        res.json({ message: 'Restriction removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing restriction' });
    }
};

// --- Advanced Gate Management ---

exports.getGateLiveStatus = async (req, res) => {
    try {
        // 1. Fetch ALL active/generated requests to process status in memory or complex query
        // We look for requests that are 'generated' (Ready or Out)
        // We join with latest log to see if they are actually OUT.

        const [rows] = await db.query(`
            SELECT 
                r.*, 
                u.name as student_name, 
                u.register_number, 
                u.phone, 
                u.department_id,
                d.name as department_name,
                h.name as hostel_name,
                (SELECT action FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_action,
                (SELECT timestamp FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_action_time
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE (
                (u.student_type = 'day_scholar' AND r.status = 'approved_hod') 
                OR (u.student_type = 'hostel' AND r.status = 'approved_warden')
                OR (r.status = 'active')
            )
        `);

        const ready = [];
        const out = [];
        const overdue = [];

        const now = new Date();

        for (const req of rows) {
            // Logic:
            // If last_action is NULL or 'entry' -> It's Ready to go (if status is generated)
            // If last_action is 'exit' -> They are OUT.

            const isOut = req.last_action === 'exit';

            const data = {
                id: req.id,
                student_name: req.student_name,
                register_number: req.register_number,
                department_name: req.department_name,
                phone: req.phone,
                type: req.type,
                hostel_name: req.hostel_name,
                departure_date: req.departure_date,
                return_date: req.return_date,
                last_action_time: req.last_action_time
            };

            if (isOut) {
                // Check Overdue
                if (new Date(req.return_date) < now) {
                    overdue.push({ ...data, overdue_by_minutes: Math.floor((now - new Date(req.return_date)) / 60000) });
                } else {
                    out.push(data);
                }
            } else {
                // Not out yet, but status is generated -> Ready
                ready.push(data);
            }
        }

        // Also add logic to explicitly catch 'overdue' that might still be in 'out' list if we want duplicates? No, separate.
        // Actually, if they are overdue, they are ALSO out. But for UI, let's put them in 'Overdue' bucket specifically or both?
        // Let's put in 'Overdue' bucket ONLY to emphasize action needed.
        // So above logic: if out -> check overdue ? overdue.push : out.push. Correct.

        res.json({
            ready,
            out,
            overdue,
            stats: {
                ready_count: ready.length,
                out_count: out.length,
                overdue_count: overdue.length
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching live gate status' });
    }
};

exports.getGateHistory = async (req, res) => {
    try {
        const { search, start_date, end_date, department_id } = req.query;

        let query = `
            SELECT 
                r.*, 
                u.name as student_name, 
                u.register_number, 
                d.name as department_name,
                (SELECT timestamp FROM logs WHERE request_id = r.id AND action='exit' ORDER BY timestamp DESC LIMIT 1) as actual_exit,
                (SELECT timestamp FROM logs WHERE request_id = r.id AND action='entry' ORDER BY timestamp DESC LIMIT 1) as actual_entry
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE 1=1
        `;

        const params = [];

        if (search) {
            query += ` AND (u.name LIKE ? OR u.register_number LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (start_date) {
            query += ` AND r.created_at >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND r.created_at <= ?`;
            params.push(end_date);
        }

        if (department_id) {
            query += ` AND u.department_id = ?`;
            params.push(department_id);
        }

        query += ` ORDER BY r.created_at DESC LIMIT 100`;

        const [rows] = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching gate history' });
    }
};
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, status, year, studentType, departmentId, hostelId } = req.query;

        // Base Query - Global Scope
        let query = `
            SELECT 
                r.id, r.type, r.reason, r.status, r.created_at, r.departure_date, r.return_date,
                u.name as student_name, u.register_number, u.year, u.student_type, u.phone as student_phone,
                d.name as department_name,
                h.name as hostel_name, room.room_number,
                m.name as mentor_name
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users m ON u.mentor_id = m.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN rooms room ON u.room_id = room.id
            WHERE 1=1
        `;

        const params = [];

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

        if (departmentId) {
            query += ` AND u.department_id = ?`;
            params.push(departmentId);
        }

        if (hostelId) {
            query += ` AND u.hostel_id = ?`;
            params.push(hostelId);
        }

        query += ` ORDER BY r.created_at DESC LIMIT 1000`; // Safety limit for admin

        const [results] = await db.query(query, params);

        res.json(results);
    } catch (error) {
        console.error('Admin Reports Error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};
