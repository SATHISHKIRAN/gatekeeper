const db = require('../config/database');
const { sendNotification } = require('./notificationController');
const { generateSecureOriginal, encryptQRProxy } = require('../utils/cryptoUtils');

exports.getVerificationQueue = async (req, res) => {
    const wardenId = req.user.id;
    try {
        const [requests] = await db.query(
            `SELECT r.*, u.name as student_name, u.trust_score, u.email
             FROM requests r 
             JOIN users u ON r.user_id = u.id 
             JOIN hostels h ON u.hostel_id = h.id
             WHERE r.status IN ('approved_hod', 'approved_staff', 'emergency') 
             AND h.warden_id = ?
             ORDER BY r.created_at ASC`,
            [wardenId]
        );
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    const wardenId = req.user.id;
    try {
        // 1. Total assigned hostel students
        const [[{ total_students }]] = await db.query(
            `SELECT COUNT(DISTINCT u.id) as total_students 
             FROM users u
             JOIN hostels h ON u.hostel_id = h.id
             WHERE u.role = 'student' AND h.warden_id = ?`,
            [wardenId]
        );

        // 2. Students Currently Out (assigned)
        const [[{ students_out }]] = await db.query(
            `SELECT COUNT(DISTINCT r.id) as students_out 
             FROM requests r
             JOIN users u ON r.user_id = u.id
             JOIN hostels h ON u.hostel_id = h.id
             WHERE r.status = 'generated' AND h.warden_id = ?`,
            [wardenId]
        );

        // 3. Pending Verifications (assigned)
        const [[{ pending_requests }]] = await db.query(
            `SELECT COUNT(DISTINCT r.id) as pending_requests 
             FROM requests r
             JOIN users u ON r.user_id = u.id
             JOIN hostels h ON u.hostel_id = h.id
             WHERE r.status IN ('approved_hod', 'approved_staff', 'emergency') 
             AND h.warden_id = ?`,
            [wardenId]
        );

        // 4. Today's Movements (assigned)
        const [[{ movements_today }]] = await db.query(
            `SELECT COUNT(DISTINCT l.id) as movements_today 
             FROM logs l
             JOIN requests r ON l.request_id = r.id
             JOIN users u ON r.user_id = u.id
             JOIN hostels h ON u.hostel_id = h.id
             WHERE DATE(l.timestamp) = CURDATE() AND h.warden_id = ?`,
            [wardenId]
        );

        // 5. Recent Activity (assigned)
        const [recent_activity] = await db.query(`
            SELECT r.id, u.name as student_name, r.type, r.status, r.updated_at
            FROM requests r
            JOIN users u ON r.user_id = u.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE r.status IN ('generated', 'rejected', 'completed')
            AND h.warden_id = ?
            ORDER BY r.updated_at DESC
            LIMIT 5
        `, [wardenId]);

        // 6. Weekly Stats (assigned)
        const [weekly_stats] = await db.query(`
            SELECT DATE(r.created_at) as date, COUNT(*) as count
            FROM requests r
            JOIN users u ON r.user_id = u.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE r.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND h.warden_id = ?
            GROUP BY DATE(r.created_at)
            ORDER BY date ASC
        `, [wardenId]);

        res.json({
            stats: {
                total_students,
                students_out,
                pending_requests,
                movements_today
            },
            recent_activity,
            weekly_stats
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: 'Server error fetching dashboard stats' });
    }
};

exports.getStudents = async (req, res) => {
    const wardenId = req.user.id;
    try {
        // Fetch students assigned to this warden's hostel block (via users.hostel_id)
        const [students] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.department_id, u.register_number, u.year, u.room_id,
                   d.name as department_name, h.name as hostel_name, r.room_number
            FROM users u
            JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'student' AND h.warden_id = ?
            ORDER BY u.name ASC
        `, [wardenId]);
        res.json(students);
    } catch (error) {
        console.error("Fetch Students Error:", error);
        res.status(500).json({ message: 'Server error fetching students' });
    }
};

exports.getUnassignedStudents = async (req, res) => {
    try {
        // Fetch unassigned hostel students (student_type = 'Hostel' AND hostel_id IS NULL)
        const [students] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.register_number, u.year, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role = 'student' 
            AND u.student_type = 'Hostel' 
            AND u.hostel_id IS NULL
            ORDER BY u.year DESC, u.register_number ASC
        `);
        res.json(students);
    } catch (error) {
        console.error("Fetch Unassigned Students Error:", error);
        res.status(500).json({ message: 'Server error fetching unassigned students' });
    }
};

exports.getUnassignedBlockStudents = async (req, res) => {
    const wardenId = req.user.id;
    try {
        // Fetch students assigned to this warden's hostel but NOT in a room
        const [students] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.register_number, u.year, d.name as department_name
            FROM users u
            JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role = 'student' 
            AND h.warden_id = ?
            AND u.room_id IS NULL
            ORDER BY u.name ASC
        `, [wardenId]);
        res.json(students);
    } catch (error) {
        console.error("Fetch Unassigned Block Students Error:", error);
        res.status(500).json({ message: 'Server error fetching unassigned block students' });
    }
};

exports.assignStudent = async (req, res) => {
    const { student_id } = req.body;
    const wardenId = req.user.id;

    try {
        // 1. Get warden's hostel
        const [hostels] = await db.query('SELECT id FROM hostels WHERE warden_id = ?', [wardenId]);
        if (hostels.length === 0) return res.status(404).json({ message: 'No hostel assigned to you' });

        const hostelId = hostels[0].id;

        // 2. Assign student to this hostel
        await db.query('UPDATE users SET hostel_id = ? WHERE id = ?', [hostelId, student_id]);

        res.json({ message: 'Student assigned safely' });
    } catch (error) {
        console.error("Assign Student Error:", error);
        res.status(500).json({ message: 'Server error assigning student' });
    }
};

exports.removeStudent = async (req, res) => {
    const { student_id } = req.body;
    console.log("Removing student ID:", student_id);

    try {
        // 1. Archive current room assignment if exists
        const [archiveResult] = await db.query(`
            UPDATE hostel_assignments 
            SET status = 'history', left_at = NOW() 
            WHERE student_id = ? AND status = 'active'
        `, [student_id]);
        console.log("Archived assignments:", archiveResult.affectedRows);

        // 2. Remove from hostel and room
        const [result] = await db.query('UPDATE users SET hostel_id = NULL, room_id = NULL WHERE id = ?', [student_id]);
        console.log("Removed from users table:", result.affectedRows);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found or already removed' });
        }

        res.json({ message: 'Student removed from hostel block successfully' });
    } catch (error) {
        console.error("Remove Student Error Detailed:", error);
        res.status(500).json({ message: 'Server error removing student: ' + error.message });
    }
};

exports.broadcast = async (req, res) => {
    const { title, message, target_group } = req.body;
    const wardenId = req.user.id;

    try {
        // Broadcast to students in hostels assigned to this warden
        const [students] = await db.query(`
            SELECT DISTINCT u.id 
            FROM users u
            JOIN hostels h ON u.hostel_id = h.id
            WHERE u.role = 'student' AND h.warden_id = ?
        `, [wardenId]);

        if (students.length > 0) {
            for (const student of students) {
                await sendNotification(
                    { userId: student.id },
                    { title, message, type: 'info', category: 'broadcast' }
                );
            }
        }

        res.json({ message: `Broadcast sent to ${students.length} students in your assigned hostels` });
    } catch (error) {
        console.error("Broadcast Error:", error);
        res.status(500).json({ message: 'Server error sending broadcast' });
    }
};

exports.verifyRequest = async (req, res) => {
    const { id } = req.params;
    const { status, actionType } = req.body; // actionType: 'approve', 'reject', 'call_parent'

    try {
        const [request] = await db.query('SELECT user_id, requires_qr FROM requests WHERE id = ?', [id]);
        if (request.length === 0) return res.status(404).json({ message: 'Request not found' });

        const studentId = request[0].user_id;
        const requires_qr = request[0].requires_qr;

        // Check Trust Score if approving
        if (status === 'approved_warden') {
            const [[user]] = await db.query('SELECT trust_score FROM users WHERE id = ?', [studentId]);
            if (user && user.trust_score < 50) {
                return res.status(403).json({ message: 'Trust Score too low. Parent confirmation required.' });
            }
        }

        await db.query('UPDATE requests SET status = ? WHERE id = ?', [status, id]);

        if (status === 'approved_warden') {
            if (requires_qr) {
                const verifyCode = generateSecureOriginal();
                const payload = {
                    id: id,
                    uid: studentId,
                    code: verifyCode,
                    ts: Date.now() // Timestamp for extra validation if needed
                };
                const qrHash = encryptQRProxy(payload);

                // Update with secure hash AND the visible 5-digit code
                await db.query('UPDATE requests SET qr_code_hash = ?, verify_code = ? WHERE id = ?', [qrHash, verifyCode, id]);

                // Advanced WhatsApp Notification with Link to Wallet
                await sendNotification(
                    { userId: studentId },
                    {
                        title: 'Gate Pass READY! 🎟️',
                        message: `Your gate pass is approved. Code: ${verifyCode}.\nQR is in your Wallet.`,
                        type: 'success',
                        link: '/wallet'
                    }
                );
            } else {
                await sendNotification({ userId: studentId }, { title: 'Leave Approved 🏠', message: 'Your hostel leave has been officially approved. Please stay within the hostel premises.', type: 'success' });
            }
        } else if (status === 'rejected') {
            await sendNotification({ userId: studentId }, { title: 'Request Rejected by Warden', message: 'Your gate pass request was rejected by the Chief Warden.', type: 'error' });
        }

        res.json({ message: `Request ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMovementHistory = async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const wardenId = req.user.id;
    const offset = (page - 1) * limit;

    try {
        const query = `
            SELECT l.*, u.name as student_name, u.email, r.type as request_type
            FROM logs l
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE h.warden_id = ? 
            AND (u.name LIKE ? OR u.email LIKE ? OR l.action LIKE ?)
            ORDER BY l.timestamp DESC
            LIMIT ? OFFSET ?
        `;
        const searchTerm = `%${search}%`;
        const [history] = await db.query(query, [wardenId, searchTerm, searchTerm, searchTerm, parseInt(limit), offset]);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT l.id) as total 
            FROM logs l 
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id 
            JOIN hostels h ON u.hostel_id = h.id
            WHERE h.warden_id = ? 
            AND (u.name LIKE ? OR u.email LIKE ? OR l.action LIKE ?)`,
            [wardenId, searchTerm, searchTerm, searchTerm]
        );

        res.json({ history, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        console.error("Movement History Error:", error);
        res.status(500).json({ message: 'Server error fetching history' });
    }
};

exports.getAnalytics = async (req, res) => {
    const wardenId = req.user.id;
    try {
        // Peak movement hours (assigned)
        const [peakHours] = await db.query(`
            SELECT HOUR(l.timestamp) as hour, COUNT(*) as count
            FROM logs l
            JOIN requests r ON l.request_id = r.id
            JOIN users u ON r.user_id = u.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE h.warden_id = ?
            GROUP BY HOUR(l.timestamp)
            ORDER BY hour ASC
        `, [wardenId]);

        // Movement types distribution (assigned)
        const [typeDistribution] = await db.query(`
            SELECT r.type, COUNT(*) as count
            FROM requests r
            JOIN users u ON r.user_id = u.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE r.status = 'completed' AND h.warden_id = ?
            GROUP BY r.type
        `, [wardenId]);

        // Department-wise movement (assigned)
        const [deptStats] = await db.query(`
            SELECT d.name as department, COUNT(*) as count
            FROM requests r
            JOIN users u ON r.user_id = u.id
            JOIN departments d ON u.department_id = d.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE r.status = 'completed' AND h.warden_id = ?
            GROUP BY d.name
        `, [wardenId]);

        res.json({ peakHours, typeDistribution, deptStats });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: 'Server error fetching analytics' });
    }
};

exports.getBroadcastHistory = async (req, res) => {
    const wardenId = req.user.id;
    try {
        // Show broadcasts sent by this warden (or to their students)
        const [broadcasts] = await db.query(`
            SELECT DISTINCT n.title, n.message, n.type, n.created_at
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            JOIN hostels h ON u.hostel_id = h.id
            WHERE n.type = 'info' AND h.warden_id = ?
            ORDER BY n.created_at DESC
            LIMIT 20
        `, [wardenId]);
        res.json(broadcasts);
    } catch (error) {
        console.error("Broadcast History Error:", error);
        res.status(500).json({ message: 'Server error fetching broadcast history' });
    }
};

exports.getStudentProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const [[student]] = await db.query(`
            SELECT u.*, d.name as department_name, h.name as hostel_name, r.room_number
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN hostels h ON u.hostel_id = h.id
            LEFT JOIN rooms r ON u.room_id = r.id
            WHERE u.id = ? AND u.role = 'student'
        `, [id]);

        if (!student) return res.status(404).json({ message: 'Student not found' });

        const [history] = await db.query(`
            SELECT r.id, r.type, r.reason, r.status, r.created_at, r.updated_at
            FROM requests r
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [id]);

        res.json({ student, history });
    } catch (error) {
        console.error("Student Profile Error:", error);
        res.status(500).json({ message: 'Server error fetching student profile' });
    }
};

// --- Room Management ---

exports.getRooms = async (req, res) => {
    const wardenId = req.user.id;
    const { floor, type, status } = req.query;

    try {
        let query = `
            SELECT r.*, 
                   COUNT(u.id) as current_occupants,
                   GROUP_CONCAT(JSON_OBJECT('id', u.id, 'name', u.name, 'register_number', u.register_number)) as occupants
            FROM rooms r
            JOIN hostels h ON r.hostel_id = h.id
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'student'
            WHERE h.warden_id = ?
        `;
        const params = [wardenId];

        if (floor) {
            query += ` AND r.floor = ?`;
            params.push(floor);
        }
        if (type) {
            query += ` AND r.type = ?`;
            params.push(type);
        }
        if (status) {
            query += ` AND r.status = ?`;
            params.push(status);
        }

        query += ` GROUP BY r.id ORDER BY r.floor ASC, r.room_number ASC`;

        const [rooms] = await db.query(query, params);

        // Parse occupants JSON
        const parsedRooms = rooms.map(room => {
            let parsedOccupants = [];
            if (room.occupants) {
                try {
                    // Wrap in array brackets
                    parsedOccupants = JSON.parse(`[${room.occupants}]`);
                    // Filter out entries where id is null (artifact of LEFT JOIN with JSON_OBJECT)
                    parsedOccupants = parsedOccupants.filter(o => o.id !== null);
                } catch (e) {
                    console.error("Error parsing occupants JSON:", e);
                    parsedOccupants = [];
                }
            }
            return {
                ...room,
                occupants: parsedOccupants
            };
        });

        res.json(parsedRooms);
    } catch (error) {
        console.error("Get Rooms Error:", error);
        res.status(500).json({ message: 'Server error fetching rooms' });
    }
};

exports.createRoom = async (req, res) => {
    const wardenId = req.user.id;
    const { room_number, floor, type, capacity } = req.body; // Capacity not in schema but could be useful, schema uses type for capacity inference usually

    try {
        const [hostels] = await db.query('SELECT id FROM hostels WHERE warden_id = ?', [wardenId]);
        if (hostels.length === 0) return res.status(404).json({ message: 'No hostel assigned to you' });
        const hostelId = hostels[0].id;

        await db.query(
            'INSERT INTO rooms (hostel_id, room_number, floor, type, status) VALUES (?, ?, ?, ?, ?)',
            [hostelId, room_number, floor, type, 'available']
        );

        res.status(201).json({ message: 'Room created successfully' });
    } catch (error) {
        console.error("Create Room Error:", error);
        res.status(500).json({ message: 'Server error creating room' });
    }
};

exports.updateRoom = async (req, res) => {
    const { id } = req.params;
    const { room_number, floor, type, status } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE rooms SET room_number = ?, floor = ?, type = ?, status = ? WHERE id = ?',
            [room_number, floor, type, status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json({ message: 'Room updated successfully' });
    } catch (error) {
        console.error("Update Room Error:", error);
        res.status(500).json({ message: 'Server error updating room: ' + error.message });
    }
};

exports.deleteRoom = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM rooms WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room not found or could not be deleted' });
        }
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error("Delete Room Error Detailed:", error.code, error.sqlMessage);
        res.status(500).json({ message: 'Server error deleting room: ' + (error.sqlMessage || error.message) });
    }
};

exports.assignRoom = async (req, res) => {
    const { student_id, room_id } = req.body;
    try {
        const [result] = await db.query('UPDATE users SET room_id = ? WHERE id = ?', [room_id, student_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ message: 'Student assigned to room' });
    } catch (error) {
        console.error("Assign Room Error:", error);
        res.status(500).json({ message: 'Server error assigning room' });
    }
};

exports.vacateRoom = async (req, res) => {
    const { student_id } = req.body;
    console.log("Vacating student:", student_id);
    try {
        const [result] = await db.query('UPDATE users SET room_id = NULL WHERE id = ?', [student_id]);
        console.log("Update Result:", result);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found or already vacated' });
        }

        res.json({ message: 'Student vacated from room' });
    } catch (error) {
        console.error("Vacate Room Error Detailed:", error);
        res.status(500).json({ message: 'Server error vacating room: ' + error.message });
    }
};
