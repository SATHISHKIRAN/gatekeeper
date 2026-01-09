const db = require('../config/database');
const { startOfWeek, startOfMonth, format } = require('date-fns');

// Executive Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [users] = await db.query('SELECT COUNT(*) as total, role FROM users GROUP BY role');
        const [activePasses] = await db.query('SELECT COUNT(*) as count FROM requests WHERE status = "active"');
        const [pendingRequests] = await db.query('SELECT COUNT(*) as count FROM requests WHERE status LIKE "pending%"');
        const [todayExits] = await db.query('SELECT COUNT(*) as count FROM logs WHERE action = "exit" AND DATE(timestamp) = CURDATE()');

        // Critical Issues (Late arrivals, SOS)
        const [critical] = await db.query(`
            SELECT COUNT(*) as count FROM requests 
            WHERE status = "active" AND return_date < NOW()
        `);

        // Format user stats
        const userStats = users.reduce((acc, curr) => {
            acc[curr.role] = curr.total;
            acc.total = (acc.total || 0) + curr.total;
            return acc;
        }, {});

        res.json({
            population: userStats,
            activePasses: activePasses[0].count,
            pendingRequests: pendingRequests[0].count,
            movementsToday: todayExits[0].count,
            criticalIssues: critical[0].count
        });
    } catch (error) {
        console.error('Principal Dashboard Error:', error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const principalId = req.user.id;
        const [users] = await db.query('SELECT id, name, email, role, phone FROM users WHERE id = ?', [principalId]);

        if (users.length === 0) return res.status(404).json({ message: 'Principal not found' });
        const user = users[0];

        // Campus Overview Stats
        const [[{ total_students }]] = await db.query('SELECT COUNT(*) as total_students FROM users WHERE role = "student"');
        const [[{ total_staff }]] = await db.query('SELECT COUNT(*) as total_staff FROM users WHERE role IN ("staff", "hod", "warden")');
        const [[{ active_passes }]] = await db.query('SELECT COUNT(*) as active_passes FROM requests WHERE status = "active"');

        res.json({
            user,
            stats: {
                total_students,
                total_staff,
                active_passes,
                campus_status: 'Secure'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

exports.getLivePulse = async (req, res) => {
    try {
        // Last 10 significant events
        const [events] = await db.query(`
            SELECT l.id, l.action, l.timestamp, u.name as user_name, u.role, r.type as pass_type
            FROM logs l
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            ORDER BY l.timestamp DESC 
            LIMIT 10
        `);
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching live pulse' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        // Pass distribution by type
        const [byType] = await db.query(`
            SELECT type, COUNT(*) as count 
            FROM requests 
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY type
        `);

        // Highest exit reasons
        const [reasons] = await db.query(`
            SELECT category, COUNT(*) as count 
            FROM requests 
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY category
            ORDER BY count DESC
            LIMIT 5
        `);

        // Outliers (Students with > 5 active/completed passes in last 7 days)
        const [outliers] = await db.query(`
            SELECT u.name, u.email, u.trust_score, COUNT(r.id) as pass_count
            FROM users u
            JOIN requests r ON u.id = r.user_id
            WHERE r.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY u.id
            HAVING pass_count > 5
            ORDER BY pass_count DESC
            LIMIT 10
        `);

        res.json({
            passDistribution: byType,
            topReasons: reasons,
            outliers
        });
    } catch (error) {
        res.status(500).json({ message: 'Analytics error' });
    }
};

exports.broadcastMessage = async (req, res) => {
    const { target_role, title, message, priority } = req.body;
    // Implementation for sending notifications would go here
    // For now, we'll insert into notifications table
    try {
        // Get target users
        let query = 'SELECT id FROM users';
        let params = [];

        if (target_role !== 'all') {
            query += ' WHERE role = ?';
            params.push(target_role);
        }

        const [users] = await db.query(query, params);

        const values = users.map(u => [u.id, title, message, priority, 'system']);
        if (values.length > 0) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type, category) VALUES ?',
                [values]
            );
        }

        res.json({ message: `Broadcast sent to ${users.length} users` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Broadcast failed' });
    }
};
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, status, year, studentType, departmentId, hostelId } = req.query;

        // Base Query - Global Scope (Read Only for Principal)
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

        query += ` ORDER BY r.created_at DESC LIMIT 1000`;

        const [results] = await db.query(query, params);

        res.json(results);
    } catch (error) {
        console.error('Principal Reports Error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};
