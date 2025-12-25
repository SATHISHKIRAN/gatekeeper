const db = require('../config/database');

exports.getLiveStatus = async (req, res) => {
    try {
        const { role, id, department_id } = req.user;
        let scopingClause = "";
        let params = [];

        // --- Role-Based Scoping ---
        if (role === 'admin' || role === 'principal' || role === 'gatekeeper') {
            // No filter, see all
        } else if (role === 'hod') {
            // See only own department
            // Assuming HOD user has department_id set, or we query departments table. 
            // Best to rely on user.department_id if reliable, or subquery.
            // Let's use subquery to be safe: users in HOD's dept.
            // Actually, usually HOD user row has department_id.
            scopingClause = " AND u.department_id = ?";
            params.push(department_id); // This requires req.user to have department_id populated by middleware/login
        } else if (role === 'staff') {
            // See only Mentees
            scopingClause = " AND u.mentor_id = ?";
            params.push(id);
        } else if (role === 'warden') {
            // See only students in hostels managed by this warden
            // Need to find hostels where warden_id = id
            scopingClause = " AND u.hostel_id IN (SELECT id FROM hostels WHERE warden_id = ?)";
            params.push(id);
        } else {
            return res.status(403).json({ message: 'Unauthorized role for gate dashboard' });
        }

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
            ${scopingClause}
        `, params);

        const ready = [];
        const out = [];
        const overdue = [];
        const now = new Date();

        for (const req of rows) {
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
                if (new Date(req.return_date) < now) {
                    overdue.push({ ...data, overdue_by_minutes: Math.floor((now - new Date(req.return_date)) / 60000) });
                } else {
                    out.push(data);
                }
            } else {
                ready.push(data);
            }
        }

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

exports.getHistory = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                l.id,
                l.action,
                l.timestamp,
                l.comments,
                l.gatekeeper_id,
                u.name as student_name, 
                u.register_number, 
                u.phone,
                d.name as department_name,
                g.name as gatekeeper_name
            FROM logs l
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users g ON l.gatekeeper_id = g.id
            WHERE 1=1
        `;

        const params = [];

        if (search) {
            query += ` AND (u.name LIKE ? OR u.register_number LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as t`;
        const [[{ total }]] = await db.query(countQuery, params);

        query += ` ORDER BY l.timestamp DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [rows] = await db.query(query, params);
        res.json({
            logs: rows,
            total,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching gate logs' });
    }
};
// ... existing exports ...

exports.verifyPass = async (req, res) => {
    try {
        const { qrHash, regNo } = req.body;

        // 1. Find the Student & Pass
        let query = `
            SELECT 
                r.id as request_id,
                r.type,
                r.category,
                r.departure_date,
                r.return_date,
                r.status,
                r.qr_code_hash as qr_code,
                u.id as user_id,
                u.name,
                u.register_number,
                u.year,
                u.student_type,
                u.phone,
                u.email,
                d.name as department,
                h.name as hostel,
                (SELECT action FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_log_action,
                (SELECT timestamp FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_log_time
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE r.status IN ('generated', 'approved_warden', 'active') 
        `;

        const params = [];

        if (qrHash) {
            // Check if hash matches r.qr_code (assuming we store hash or simplistic comparison)
            // Implementation specific: If 'qr_code' column stores the hash string
            query += " AND r.qr_code_hash = ?";
            params.push(qrHash);
        } else if (regNo) {
            query += " AND u.register_number = ?";
            params.push(regNo);
            // If manual entry, we should prefer the *latest* active pass
            query += " ORDER BY r.created_at DESC";
        } else {
            return res.status(400).json({ message: 'Provide QR Hash or Register Number' });
        }

        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            // No active/approved request found. 
            // Check if user exists but has no pass (Access Denied)
            if (regNo) {
                const [users] = await db.query('SELECT name FROM users WHERE register_number = ?', [regNo]);
                if (users.length > 0) return res.status(404).json({ message: 'No Active Pass Found for Student', student: users[0] });
            }
            return res.status(404).json({ message: 'Invalid QR or No Active Pass Found' });
        }

        const pass = rows[0];
        const now = new Date();

        // 2. Determine Allowed Actions
        let status = 'valid';
        let allowedActions = [];
        let message = 'Pass Valid';
        let warning = null;

        // State Logic
        // last_log_action: NULL (Never left) -> Allow EXIT
        // last_log_action: 'exit' (Outside) -> Allow ENTRY
        // last_log_action: 'entry' (Back inside) -> Pass Completed/Closed?

        if (!pass.last_log_action) {
            // READY TO EXIT
            allowedActions = ['exit'];
            message = 'Ready for Departure';
        } else if (pass.last_log_action === 'exit') {
            // IS OUTSIDE
            allowedActions = ['entry'];
            status = 'out';
            message = 'Student is Outside';

            // Check Overdue
            if (new Date(pass.return_date) < now) {
                warning = 'OVERDUE: Student is late returning!';
                status = 'overdue';
            }
        } else if (pass.last_log_action === 'entry') {
            // ALREADY RETURNED - Pass is effectively closed unless it's a multi-entry pass (rare)
            status = 'expired';
            message = 'Pass Closed (Student already returned)';
            // allowedActions = []; // Or maybe allow 're-exit' if it's within timeframe? 
            // For safety, assume single trip for now.
        }

        res.json({
            success: true,
            status,
            message,
            warning,
            allowedActions,
            pass: {
                id: pass.request_id,
                type: pass.type,
                category: pass.category,
                departure: pass.departure_date,
                return: pass.return_date,
                qr_code: pass.qr_code
            },
            student: {
                id: pass.user_id,
                name: pass.name,
                regNo: pass.register_number,
                dept: pass.department,
                year: pass.year,
                type: pass.student_type,
                photo: null // Placeholder
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Verification Error' });
    }
};

const { sendNotification } = require('./notificationController');

exports.logAction = async (req, res) => {
    try {
        const { requestId, action, comments } = req.body; // action: 'exit' or 'entry'

        if (!['exit', 'entry'].includes(action)) {
            return res.status(400).json({ message: 'Invalid Action' });
        }

        // 1. Fetch Student Details for Notification
        const [[request]] = await db.query(`
            SELECT r.user_id, r.type, u.name 
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ?
        `, [requestId]);

        if (!request) return res.status(404).json({ message: 'Request context not found' });

        // 2. Insert Log
        await db.query(`
            INSERT INTO logs (request_id, action, timestamp, comments, gatekeeper_id)
            VALUES (?, ?, NOW(), ?, ?)
        `, [requestId, action, comments || '', req.user.id]);

        // 3. Dispatch Real-Time Notifications
        const statusVerb = action === 'exit' ? 'DEPARTED' : 'RETURNED';
        const emoji = action === 'exit' ? '🚀' : '🏠';

        await sendNotification(
            { userId: request.user_id },
            {
                title: `Movement Logged: ${statusVerb} ${emoji}`,
                message: `Hi ${request.name}, you have officially ${action}ed the premises at ${new Date().toLocaleTimeString()}.`,
                type: 'info',
                category: 'security' // 'security' category triggers parent WhatsApp in our controller
            }
        );

        res.json({ message: `Successfully marked ${action.toUpperCase()}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Logging Error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        // Simple counters for today
        // Exits Today
        const [[{ exits }]] = await db.query(`SELECT COUNT(*) as exits FROM logs WHERE action='exit' AND DATE(timestamp) = CURDATE()`);
        // Entries Today
        const [[{ entries }]] = await db.query(`SELECT COUNT(*) as entries FROM logs WHERE action='entry' AND DATE(timestamp) = CURDATE()`);
        // Currently Out (Last action is exit)
        // Complex query: Requests where last log is exit
        // Simplified approach for speed: Get all requests with exit today, subtract entries? 
        // Correct approach: Count requests where latest log is 'exit'
        // This is heavy, maybe just use the count from 'getLiveStatus' logic if shared, but for now independent:

        // Approximate 'Active Out': active requests with NO entry after exit.
        const [[{ activeOut }]] = await db.query(`
            SELECT COUNT(DISTINCT r.id) as activeOut
            FROM requests r
            JOIN logs l1 ON r.id = l1.request_id
            WHERE l1.action = 'exit'
            AND NOT EXISTS (
                SELECT 1 FROM logs l2 
                WHERE l2.request_id = r.id 
                AND l2.action = 'entry' 
                AND l2.timestamp > l1.timestamp
            )
            AND r.status IN ('generated', 'approved_warden', 'active')
        `);

        res.json({
            activeOut,
            exitsToday: exits,
            entriesToday: entries
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Stats Error' });
    }
};
