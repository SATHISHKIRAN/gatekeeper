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
                u.student_type,
                u.department_id,
                d.name as department_name,
                h.name as hostel_name,
                u.profile_image,
                (SELECT action FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_action,
                (SELECT timestamp FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_action_time
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            WHERE (
                (u.student_type = 'Day Scholar' AND r.status = 'approved_hod') 
                OR (u.student_type = 'Hostel' AND r.status = 'approved_warden')
                OR (r.status = 'active')
            )
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
                student_type: req.student_type,
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
        try {
            require('fs').appendFileSync('gate_error.log', `[LIVE] ${new Date().toISOString()} - ${error.stack}\n`);
        } catch (e) { }
        res.status(500).json({ message: 'Error fetching live gate status: ' + error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const { role, id: userId, department_id } = req.user;
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

        let scopingClause = "";
        let scopingParams = [];

        if (role === 'staff') {
            scopingClause = " AND u.mentor_id = ?";
            scopingParams.push(userId);
        } else if (role === 'hod') {
            scopingClause = " AND u.department_id = ?";
            scopingParams.push(department_id);
        } else if (role === 'warden') {
            scopingClause = " AND u.hostel_id IN (SELECT id FROM hostels WHERE warden_id = ?)";
            scopingParams.push(userId);
        }

        query += scopingClause;
        const params = [...scopingParams];

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
        try {
            require('fs').appendFileSync('gate_error.log', `[HISTORY] ${new Date().toISOString()} - ${error.stack}\n`);
        } catch (e) { }
        res.status(500).json({ message: 'Error fetching gate logs: ' + error.message });
    }
};
// ... existing exports ...

exports.verifyPass = async (req, res) => {
    try {
        const { regNo } = req.body;

        if (!regNo) {
            return res.status(400).json({ message: 'Register Number is required' });
        }

        // 1. Find the Student & Pass
        // Use flexible case matching for Register Number
        let query = `
            SELECT 
                r.id as request_id,
                r.type,
                r.category,
                r.reason,
                r.created_at,
                r.departure_date,
                r.return_date,
                r.status,
                u.id as user_id,
                u.name,
                u.register_number,
                u.year,
                u.student_type,
                u.phone,
                u.email,
                u.trust_score,
                u.profile_image,
                u.parent_phone,
                u.room_id,
                d.name as department,
                h.name as hostel,
                m.name as mentor_name,
                m.phone as mentor_phone,
                u.department_id,
                u.hostel_id,
                (SELECT action FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_log_action,
                (SELECT timestamp FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_log_time
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN users m ON u.mentor_id = m.id
            WHERE (
                (u.student_type IN ('day_scholar', 'Day Scholar') AND r.status = 'approved_hod') 
                OR (u.student_type IN ('hostel', 'Hostel') AND r.status = 'approved_warden')
                OR (r.status = 'approved_hod' AND r.type = 'emergency')
                OR (r.status = 'active')
            )
            AND u.register_number LIKE ? 
            ORDER BY r.created_at DESC
        `;

        // Note: LIKE is case-insensitive in standard MySQL collations
        const [rows] = await db.query(query, [regNo]);

        if (rows.length === 0) {
            console.warn(`[VERIFY_FAIL] No active pass found for RegNo: ${regNo}`);

            // Checking if user exists to provide better error
            if (regNo) {
                console.log('Checking if user exists despite no pass...');
                const [users] = await db.query('SELECT name, register_number, student_type, mentor_id, department_id, hostel_id FROM users WHERE register_number LIKE ?', [regNo]);
                if (users.length > 0) {
                    console.log('User found:', users[0]);
                    return res.status(404).json({ message: 'No Active Pass Found for Student', student: users[0] });
                } else {
                    console.log('User NOT found in DB');
                }
            }
            return res.status(404).json({ message: 'student not found or no pass' });
        }

        console.log(`[VERIFY_SUCCESS] Found pass for ${rows[0].register_number}, Status: ${rows[0].status}`);


        const pass = rows[0];

        // --- Safe Authority Fetching ---
        let hod = { name: null, phone: null };
        let warden = { name: null, phone: null };

        try {
            // Fetch HOD (User with role='hod' in same dept)
            if (pass.department_id) {
                const [hods] = await db.query("SELECT name, phone FROM users WHERE role = 'hod' AND department_id = ? LIMIT 1", [pass.department_id]);
                if (hods.length) hod = hods[0];
            }

            // Fetch Warden (User linked to hostel via hostels table OR role='warden' in hostel)
            if (pass.hostel_id) {
                const [h_rows] = await db.query("SELECT warden_id FROM hostels WHERE id = ?", [pass.hostel_id]);
                if (h_rows.length && h_rows[0].warden_id) {
                    const [wardens] = await db.query("SELECT name, phone FROM users WHERE id = ?", [h_rows[0].warden_id]);
                    if (wardens.length) warden = wardens[0];
                }
            }
        } catch (e) {
            console.warn("Authority fetch error:", e.message);
        }
        const now = new Date();

        // 3. Mobility Intelligence
        const [[{ frequency_7d }]] = await db.query(
            "SELECT COUNT(*) as frequency_7d FROM logs l JOIN requests r ON l.request_id = r.id WHERE r.user_id = ? AND l.action = 'exit' AND l.timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)",
            [pass.user_id]
        );

        const [[{ late_returns_30d }]] = await db.query(
            "SELECT COUNT(*) as late_returns_30d FROM logs l JOIN requests r ON l.request_id = r.id WHERE r.user_id = ? AND l.action = 'entry' AND l.timestamp > r.return_date AND l.timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)",
            [pass.user_id]
        );

        const [recent_reasons] = await db.query(
            "SELECT reason FROM requests WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 3",
            [pass.user_id]
        );

        // 4. Determine Allowed Actions & Status Logic
        let status = 'valid';
        let allowedActions = [];
        let message = 'Pass Valid';
        let warning = null;
        const isEmergency = pass.type && pass.type.toLowerCase() === 'emergency';
        const isDayScholar = pass.student_type && pass.student_type.toLowerCase().includes('day');

        // --- DYNAMIC POLICY LOOKUP ---
        const typeKey = isDayScholar ? 'Day Scholar' : 'Hostel';
        const [policies] = await db.query('SELECT * FROM pass_policies WHERE student_type = ? AND pass_type = ?', [typeKey, pass.type]);

        if (policies.length > 0) {
            const policy = policies[0];
            if (policy.gate_action === 'no_scan') {
                status = 'valid_no_scan';
                message = 'Pass Approved (Gate Scan Not Required)';
                allowedActions = [];
            } else if (policy.gate_action === 'no_exit') {
                status = 'valid_internal';
                message = 'Internal Pass - No Exit Allowed';
                allowedActions = [];
            } else if (policy.gate_action === 'scan_exit') {
                if (!pass.last_log_action) {
                    allowedActions = ['exit'];
                    message = 'Ready for Exit';
                } else {
                    status = 'completed';
                    message = 'Pass Completed';
                    allowedActions = [];
                }
            }
            // 'scan_both' falls through to standard logic below
        } else {
            // Legacy Fallbacks (if policy missing)
            if (isDayScholar) {
                if (pass.type === 'Leave' || pass.type === 'On Duty') {
                    status = 'valid_no_scan';
                    message = 'Pass Approved (Gate Scan Not Required)';
                    allowedActions = [];
                } else if (pass.type === 'Permission') {
                    if (!pass.last_log_action) {
                        allowedActions = ['exit'];
                        message = 'Ready for Early Exit';
                    } else {
                        status = 'completed';
                        message = 'Pass Completed';
                        allowedActions = [];
                    }
                }
            }
            // Hostel Permission Fallback
            const isHostel = pass.student_type && pass.student_type.toLowerCase() === 'hostel';
            if (isHostel && pass.type === 'Permission') {
                status = 'valid_internal';
                message = 'Internal Permission (Hostel Room Only)';
                allowedActions = [];
            }
        }

        // --- Standard Logic (Hostel or Day Scholar Emergency/Other) ---
        // Only run if status hasn't been determined as special (valid_no_scan / completed permission)
        if (status === 'valid') {
            if (!pass.last_log_action) {
                allowedActions = ['exit'];
                message = 'Ready for Departure';
            } else if (pass.last_log_action === 'exit') {
                // If Day Scholar Permission, should have been handled above? 
                // If fell through (e.g. Emergency), handle as 'out'.
                allowedActions = ['entry'];
                status = 'out';
                message = 'Student is Outside';
                if (new Date(pass.return_date) < now) {
                    warning = 'OVERDUE RETURN: Student is late returning!';
                    status = 'overdue';
                }
            } else if (pass.last_log_action === 'entry' || pass.status === 'completed') {
                status = 'expired';
                message = 'Pass Used (Student already returned)';
                allowedActions = [];
            }

            // Timing Checks (Departure Buffer)
            if (!pass.last_log_action && pass.status !== 'completed' && status !== 'valid_no_scan') {
                // Only for standard 'exit' flows
                const depTime = new Date(pass.departure_date);
                const gracePeriod = isEmergency ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;

                if (now > new Date(depTime.getTime() + gracePeriod)) {
                    // For Day Scholar Permission, maybe strict? 
                    // "show expired with in the exit time"
                    if (isDayScholar && pass.type === 'Permission') {
                        status = 'expired';
                        message = 'Permission Pass Expired (Exit Time Missed)';
                        allowedActions = [];
                    } else {
                        warning = 'LATE DEPARTURE: This pass is significantly past its departure time!';
                        message = 'Departure Time Passed';
                    }
                }

                // Early Departure Check
                if (!isEmergency && status !== 'expired') {
                    const departureTime = new Date(pass.departure_date);
                    const bufferTime = new Date(departureTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

                    if (now < bufferTime) {
                        status = 'early';
                        message = `Too Early to Exit`;
                        warning = `Early Departure: Scheduled for ${bufferTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Process with caution.`;
                        allowedActions = ['exit'];
                    }
                }
            }
        }

        // Fetch full timeline logs
        const [logs] = await db.query(
            `SELECT action, timestamp, comments, 
            (SELECT name FROM users WHERE id = logs.gatekeeper_id) as actor_name,
            (SELECT role FROM users WHERE id = logs.gatekeeper_id) as actor_role
            FROM logs WHERE request_id = ? ORDER BY timestamp ASC`,
            [pass.request_id]
        );

        // Synthetic 'Requested' Event from created_at
        const timeline = [
            {
                action: 'requested',
                timestamp: pass.created_at,
                comments: pass.reason,
                actor_name: pass.name,
                actor_role: 'student'
            },
            ...logs
        ];

        res.json({
            success: true,
            status,
            message,
            warning,
            allowedActions,
            intelligence: {
                frequency_7d,
                late_returns_30d,
                recent_reasons: recent_reasons.map(r => r.reason),
                tags: [
                    frequency_7d >= 5 ? 'Frequent Mover' : null,
                    late_returns_30d === 0 && frequency_7d > 2 ? 'Highly Punctual' : null,
                    late_returns_30d > 2 ? 'High Risk' : null
                ].filter(Boolean)
            },
            pass: {
                id: pass.request_id,
                type: pass.type,
                category: pass.category,
                reason: pass.reason,
                departure: pass.departure_date,
                return: pass.return_date,
                qr_code: pass.qr_code,
                timeline: timeline
            },
            student: {
                id: pass.user_id,
                name: pass.name,
                regNo: pass.register_number,
                dept: pass.department,
                year: pass.year,
                type: pass.student_type,
                trustScore: pass.trust_score,
                photo: pass.profile_image,
                parent_phone: pass.parent_phone,
                room_id: pass.room_id,
                mentor: { name: pass.mentor_name, phone: pass.mentor_phone },
                hod: hod,
                warden: warden
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Verification Error: ' + error.message });
    }
};

const { sendNotification } = require('./notificationController');

exports.logAction = async (req, res) => {
    try {
        const { requestId, action, comments } = req.body; // action: 'exit' or 'entry'

        if (!['exit', 'entry'].includes(action)) {
            return res.status(400).json({ message: 'Invalid Action' });
        }

        // 1. Fetch Student Details & Current Status
        const [[request]] = await db.query(`
            SELECT r.status, r.user_id, r.type, u.name, r.departure_date, u.student_type
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ?
        `, [requestId]);

        if (!request) return res.status(404).json({ message: 'Request context not found' });

        // 2. Prevent Duplicate Actions (Idempotency)
        let newStatus = action === 'exit' ? 'active' : 'completed';

        // --- Day Scholar Permission Logic ---
        // If Day Scholar Permission Exit -> Mark as COMPLETED immediately (Single Scan)
        if (request.student_type && request.student_type.toLowerCase().includes('day') && request.type === 'Permission' && action === 'exit') {
            newStatus = 'completed';
        }

        if (request.status === newStatus) {
            return res.status(400).json({ message: `Action already recorded: Student is already ${newStatus}` });
        }

        // Also prevent 'entry' if not 'active' (unless flexible?) - Keeping strictly state-based for now.
        if (action === 'entry' && request.status !== 'active') {
            // Optional: Allow panic entry? No, strictly flow.
            // return res.status(400).json({ message: 'Cannot record entry: Pass is not active' });
        }

        // --- 2-Hour Buffer Logic (Security Enforced) ---
        // Bypass based on latest policy (Warnings only)
        // const isEmergency = request.type === 'emergency' || request.category === 'medical';
        // Check removed/relaxed to align with Verify Step

        // 2. Insert Log & Update Pass Status
        // const newStatus defined above

        await db.query('UPDATE requests SET status = ? WHERE id = ?', [newStatus, requestId]);

        await db.query(`
            INSERT INTO logs (request_id, action, timestamp, comments, gatekeeper_id)
            VALUES (?, ?, NOW(), ?, ?)
        `, [requestId, action, comments || '', req.user.id]);

        // 3. Dispatch Real-Time Notifications
        const statusVerb = action === 'exit' ? 'DEPARTED' : 'RETURNED';
        const emoji = action === 'exit' ? '🚀' : '🏠';

        try {
            await sendNotification(
                { userId: request.user_id },
                {
                    title: `Movement Logged: ${statusVerb} ${emoji}`,
                    message: `Hi ${request.name}, you have officially ${action}ed the premises at ${new Date().toLocaleTimeString()}.`,
                    type: 'info',
                    category: 'security'
                }
            );

            // Notify Gatekeepers (Live Monitor Update)
            await sendNotification(
                { role: 'gatekeeper' },
                {
                    title: 'Gate Activity Update',
                    message: `${request.name} has ${action}ed.`,
                    type: 'info', // or silent if supported
                    category: 'system'
                }
            );
        } catch (notifError) {
            console.error('Notification Error:', notifError);
            // Non-blocking
        }

        res.json({ message: `Successfully marked ${action.toUpperCase()}` });

    } catch (error) {
        console.error(error);
        try {
            require('fs').appendFileSync('gate_error.log', `[LOG_ACTION] ${new Date().toISOString()} - ${error.stack}\n`);
        } catch (e) { }
        res.status(500).json({ message: 'Logging Error: ' + error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { role, id: userId, department_id } = req.user;
        let scopingClause = "";
        let params = [];

        if (role === 'staff') {
            scopingClause = " AND u.mentor_id = ?";
            params.push(userId);
        } else if (role === 'hod') {
            scopingClause = " AND u.department_id = ?";
            params.push(department_id);
        } else if (role === 'warden') {
            scopingClause = " AND u.hostel_id IN (SELECT id FROM hostels WHERE warden_id = ?)";
            params.push(userId);
        }

        // Exits Today
        const [[{ exits }]] = await db.query(`
            SELECT COUNT(*) as exits FROM logs l 
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            WHERE action='exit' AND DATE(timestamp) = CURDATE() ${scopingClause}
        `, params);

        // Entries Today
        const [[{ entries }]] = await db.query(`
            SELECT COUNT(*) as entries FROM logs l
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            WHERE action='entry' AND DATE(timestamp) = CURDATE() ${scopingClause}
        `, params);

        // Approximate 'Active Out': active requests with NO entry after exit.
        const [[{ activeOut }]] = await db.query(`
            SELECT COUNT(DISTINCT r.id) as activeOut
            FROM requests r
            JOIN users u ON r.user_id = u.id
            JOIN logs l1 ON r.id = l1.request_id
            WHERE l1.action = 'exit'
            AND NOT EXISTS (
                SELECT 1 FROM logs l2 
                WHERE l2.request_id = r.id 
                AND l2.action = 'entry' 
                AND l2.timestamp > l1.timestamp
            )
            AND (
                (u.student_type = 'Day Scholar' AND r.status = 'approved_hod') 
                OR (u.student_type = 'Hostel' AND r.status = 'approved_warden')
                OR (r.status = 'active')
            )
            ${scopingClause}
        `, params);

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

exports.syncCache = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id as request_id,
                r.type,
                r.departure_date,
                r.return_date,
                r.status,
                u.name,
                u.register_number,
                u.department_id,
                d.name as department_name,
                u.student_type,
                u.year,
                u.trust_score,
                (SELECT action FROM logs WHERE request_id = r.id ORDER BY timestamp DESC LIMIT 1) as last_action
            FROM requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE (
                (u.student_type = 'day_scholar' AND r.status = 'approved_hod') 
                OR (u.student_type = 'hostel' AND r.status = 'approved_warden')
                OR (r.status = 'approved_hod' AND r.type = 'emergency')
                OR (r.status = 'active')
            )
            AND r.return_date >= NOW()
        `;

        const [rows] = await db.query(query);

        const cacheData = rows.map(r => ({
            regNo: r.register_number,
            name: r.name,
            dept: r.department_name,
            year: r.year,
            type: r.student_type,
            trustScore: r.trust_score,
            pass: {
                id: r.request_id,
                type: r.type,
                status: r.status,
                departure: r.departure_date,
                return: r.return_date,
                last_action: r.last_action
            }
        }));

        res.json({
            timestamp: new Date().toISOString(),
            count: cacheData.length,
            data: cacheData
        });

    } catch (error) {
        console.error('Cache Sync Error:', error);
        res.status(500).json({ message: 'Sync Failed' });
    }
};

exports.getStudentProfile = async (req, res) => {
    const studentId = req.params.id;

    try {
        // 1. Fetch Student Identity (Global Scope for Gatekeeper)
        const [users] = await db.query(
            `SELECT id, name, email, register_number, trust_score, pass_blocked, year, cooldown_override_until, department_id, profile_image, parent_phone, room_id,
             (SELECT name FROM departments WHERE id = users.department_id) as department_name,
             (SELECT name FROM departments WHERE id = users.department_id) as department_name,
             (SELECT COUNT(*) FROM requests r WHERE r.user_id = users.id AND r.status = 'cancelled' AND r.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
              AND (users.cooldown_override_until IS NULL OR r.updated_at > users.cooldown_override_until)) as cooldown_count
             FROM users WHERE id = ? AND role = "student"`,
            [studentId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Student metadata not found.' });
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

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Fetch User Details
        const [users] = await db.query('SELECT id, name, email, phone, role, status FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = users[0];

        // 2. Fetch Stats (Scans Today)
        const [[{ scans_today }]] = await db.query(
            "SELECT COUNT(*) as scans_today FROM logs WHERE gatekeeper_id = ? AND DATE(timestamp) = CURDATE()",
            [userId]
        );

        res.json({
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                assigned_gate: 'Main Gate' // Placeholder
            },
            stats: {
                scans_today,
                status: user.status || 'Active'
            }
        });
    } catch (error) {
        console.error('Gate Profile Error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, action, studentType, departmentId, hostelId, page = 1, limit = 10 } = req.query;
        const { role, id: userId, department_id } = req.user;
        const offset = (page - 1) * limit;

        // Base Query - Joining logs with requests/users/departments/hostels
        let query = `
            SELECT 
                l.id, l.action, l.timestamp, l.comments,
                r.type as pass_type, r.reason, r.departure_date, r.return_date,
                u.name as student_name, u.register_number, u.student_type, u.year,
                d.name as department_name,
                h.name as hostel_name,
                g.name as gatekeeper_name
            FROM logs l
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN users g ON l.gatekeeper_id = g.id
            WHERE 1=1
        `;

        const params = [];

        // Scoping Logic
        if (role === 'staff') {
            query += " AND u.mentor_id = ?";
            params.push(userId);
        } else if (role === 'hod') {
            query += " AND u.department_id = ?";
            params.push(department_id);
        } else if (role === 'warden') {
            query += " AND u.hostel_id IN (SELECT id FROM hostels WHERE warden_id = ?)";
            params.push(userId);
        }

        // Filters
        if (startDate && endDate) {
            query += ` AND l.timestamp BETWEEN ? AND ?`;
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        } else if (startDate) {
            query += ` AND l.timestamp >= ?`;
            params.push(`${startDate} 00:00:00`);
        } else if (endDate) {
            query += ` AND l.timestamp <= ?`;
            params.push(`${endDate} 23:59:59`);
        }

        if (action) {
            query += ` AND l.action = ?`;
            params.push(action);
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

        // Count for Pagination
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as t`;
        const [[{ total }]] = await db.query(countQuery, params);

        // Sorting and Pagination
        query += ` ORDER BY l.timestamp DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(query, params);

        res.json({
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('[REPORTS_ERROR]', error);
        res.status(500).json({ message: 'Error generating movement logs report' });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM departments ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
};

exports.getHostels = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, type FROM hostels ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hostels' });
    }
};
