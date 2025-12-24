const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.getGlobalStats = async (req, res) => {
    try {
        // 1. Basic Counts
        const [[{ count: total_students }]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [[{ count: total_requests }]] = await db.query('SELECT COUNT(*) as count FROM requests');
        const [[{ count: active_passes }]] = await db.query('SELECT COUNT(*) as count FROM requests WHERE status = "generated"');

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
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM requests 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // 4. Request Type Distribution
        const [type_distribution] = await db.query(`
            SELECT type as name, COUNT(*) as value 
            FROM requests 
            GROUP BY type
        `);

        // 5. Hourly Activity (Last 24 Hours)
        const [hourly_activity] = await db.query(`
            SELECT HOUR(timestamp) as hour, action, COUNT(*) as count 
            FROM logs 
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
            GROUP BY HOUR(timestamp), action
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
    const { name, email, password, role, department_id, phone, year, register_number, student_type, hostel_id } = req.body;
    try {
        const password_hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password_hash, role, department_id, phone, year, register_number, status, student_type, hostel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", ?, ?)',
            [name, email, password_hash, role, department_id, phone, year, register_number, student_type, hostel_id || null]
        );
        res.json({ message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already registered' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, role, department_id, trust_score, status, phone, year, register_number, email, student_type, hostel_id } = req.body;
    try {
        // Fetch current state to check for trust score change
        const [[currentUser]] = await db.query('SELECT trust_score FROM users WHERE id = ?', [id]);

        await db.query(
            'UPDATE users SET name = ?, role = ?, department_id = ?, trust_score = ?, status = ?, phone = ?, year = ?, register_number = ?, email = ?, student_type = ?, hostel_id = ? WHERE id = ?',
            [name, role, department_id, trust_score, status, phone, year, register_number, email, student_type, hostel_id || null, id]
        );

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
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
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
        const [[student]] = await db.query(`
            SELECT u.*, d.name as department_name, h.name as hostel_name 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE u.id = ?
        `, [id]);

        // 2. Trust History (Extended)
        const [trustHistory] = await db.query('SELECT * FROM trust_history WHERE user_id = ? ORDER BY created_at DESC', [id]);

        // 3. Mobility History (Last 30 Days for Charts)
        const [mobilityLogs] = await db.query(`
            SELECT l.*, r.type as request_type 
            FROM logs l 
            JOIN requests r ON l.request_id = r.id 
            WHERE r.user_id = ? AND l.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY l.timestamp DESC
        `, [id]);

        // 4. Full Request History
        const [requests] = await db.query(`
            SELECT * FROM requests 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [id]);

        // 5. Pass Statistics
        const [[stats]] = await db.query(`
            SELECT 
            COUNT(*) as total_passes,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'approved_warden' THEN 1 ELSE 0 END) as active
            FROM requests WHERE user_id = ?
        `, [id]);

        res.json({ student, trustHistory, mobilityLogs, requests, stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Oversight sync failed' });
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
    const { name, code, description } = req.body;
    try {
        await db.query('INSERT INTO departments (name, code, description) VALUES (?, ?, ?)', [name, code, description]);
        res.json({ message: 'Department created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating department' });
    }
};

exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, code, description, hod_id } = req.body;
    try {
        await db.query(
            'UPDATE departments SET name = ?, code = ?, description = ?, hod_id = ? WHERE id = ?',
            [name, code, description, hod_id || null, id]
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
            WHERE r.status IN ('generated', 'approved_warden') 
            -- 'approved_warden' might be waiting for generation? usually 'generated' means QR is ready.
            -- We focus on 'generated' as "Active/Live" cycle.
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
