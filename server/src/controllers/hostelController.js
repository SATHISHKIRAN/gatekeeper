const db = require('../config/database');

// --- Hostel Block Management ---
exports.getHostels = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                h.*,
                u.name as warden_name,
                (SELECT COUNT(*) FROM rooms r WHERE r.hostel_id = h.id) as total_rooms,
                (SELECT COUNT(*) FROM rooms r WHERE r.hostel_id = h.id AND r.status = 'available') as available_rooms,
                (SELECT COUNT(*) FROM users s WHERE s.hostel_id = h.id AND s.role = 'student') as active_students
            FROM hostels h
            LEFT JOIN users u ON h.warden_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching hostels' });
    }
};

exports.createHostel = async (req, res) => {
    const { name, type, description, warden_id } = req.body;
    try {
        await db.query('INSERT INTO hostels (name, type, description, warden_id) VALUES (?, ?, ?, ?)', [name, type, description, warden_id || null]);
        res.json({ message: 'Hostel created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating hostel' });
    }
};

exports.updateHostel = async (req, res) => {
    const { id } = req.params;
    const { name, type, description, warden_id } = req.body;
    try {
        await db.query('UPDATE hostels SET name = ?, type = ?, description = ?, warden_id = ? WHERE id = ?', [name, type, description, warden_id || null, id]);
        res.json({ message: 'Hostel updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating hostel' });
    }
};

exports.deleteHostel = async (req, res) => {
    try {
        await db.query('DELETE FROM hostels WHERE id = ?', [req.params.id]);
        res.json({ message: 'Hostel deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting hostel' });
    }
};

// --- Room Management ---
exports.getRooms = async (req, res) => {
    const { hostel_id } = req.query;
    try {
        let query = 'SELECT r.*, h.name as hostel_name FROM rooms r JOIN hostels h ON r.hostel_id = h.id';
        let params = [];
        if (hostel_id) {
            query += ' WHERE r.hostel_id = ?';
            params.push(hostel_id);
        }
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching rooms' });
    }
};

exports.createRoom = async (req, res) => {
    const { hostel_id, room_number, floor, type } = req.body;
    try {
        await db.query('INSERT INTO rooms (hostel_id, room_number, floor, type) VALUES (?, ?, ?, ?)', [hostel_id, room_number, floor, type]);
        res.json({ message: 'Room created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating room' });
    }
};

exports.updateRoom = async (req, res) => {
    const { id } = req.params;
    const { room_number, floor, type, status } = req.body;
    try {
        await db.query('UPDATE rooms SET room_number = ?, floor = ?, type = ?, status = ? WHERE id = ?', [room_number, floor, type, status, id]);
        res.json({ message: 'Room updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating room' });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting room' });
    }
};

// --- Assignment Management ---
exports.getAssignments = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                ha.*, 
                u.name as student_name, u.register_number, u.email,
                r.room_number, h.name as hostel_name
            FROM hostel_assignments ha
            JOIN users u ON ha.student_id = u.id
            JOIN rooms r ON ha.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            WHERE ha.status = 'active'
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};

exports.assignRoom = async (req, res) => {
    const { student_id, room_id } = req.body;
    try {
        // Start transaction
        await db.query('START TRANSACTION');

        // Check if room is available
        const [room] = await db.query('SELECT status FROM rooms WHERE id = ?', [room_id]);
        if (room[0].status !== 'available') {
            await db.query('ROLLBACK');
            return res.status(400).json({ message: 'Room is not available' });
        }

        // Check if student already has a room
        const [existing] = await db.query('SELECT id FROM hostel_assignments WHERE student_id = ? AND status = "active"', [student_id]);
        if (existing.length > 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ message: 'Student is already assigned to a room' });
        }

        // Assign room
        await db.query('INSERT INTO hostel_assignments (student_id, room_id) VALUES (?, ?)', [student_id, room_id]);

        // Update room status
        await db.query('UPDATE rooms SET status = "occupied" WHERE id = ?', [room_id]);

        await db.query('COMMIT');
        res.json({ message: 'Room assigned successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Error assigning room' });
    }
};

exports.unassignRoom = async (req, res) => {
    const { id } = req.params; // assignment_id
    try {
        await db.query('START TRANSACTION');

        const [assignment] = await db.query('SELECT room_id FROM hostel_assignments WHERE id = ?', [id]);
        if (assignment.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Update assignment status to history
        await db.query('UPDATE hostel_assignments SET status = "history" WHERE id = ?', [id]);

        // Update room status to available
        await db.query('UPDATE rooms SET status = "available" WHERE id = ?', [assignment[0].room_id]);

        await db.query('COMMIT');
        res.json({ message: 'Student unassigned successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Error unassigning room' });
    }
};

// --- Analytics ---
exports.getHostelStats = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM hostels) as total_blocks,
                (SELECT COUNT(*) FROM rooms) as total_capacity,
                (SELECT COUNT(*) FROM rooms WHERE status = 'available') as available_slots,
                (SELECT COUNT(*) FROM users WHERE hostel_id IS NOT NULL AND role = 'student') as occupied_slots,
                (SELECT COUNT(*) FROM rooms WHERE status = 'maintenance') as maintenance_rooms
        `);
        res.json(stats[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// --- Maintenance Requests ---
exports.getMaintenanceRequests = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT mr.*, r.room_number, h.name as hostel_name, u.name as student_name
            FROM maintenance_requests mr
            JOIN rooms r ON mr.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            JOIN users u ON mr.student_id = u.id
            ORDER BY mr.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching maintenance requests' });
    }
};

exports.createMaintenanceRequest = async (req, res) => {
    const { room_id, student_id, category, priority, description } = req.body;
    try {
        await db.query(
            'INSERT INTO maintenance_requests (room_id, student_id, category, priority, description) VALUES (?, ?, ?, ?, ?)',
            [room_id, student_id, category, priority, description]
        );
        res.json({ message: 'Maintenance request submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting maintenance request' });
    }
};

exports.updateMaintenanceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE maintenance_requests SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Maintenance status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating maintenance status' });
    }
};

// --- Hostel Announcements ---
exports.getAnnouncements = async (req, res) => {
    const { hostel_id } = req.query;
    try {
        let query = 'SELECT ha.*, h.name as hostel_name FROM hostel_announcements ha LEFT JOIN hostels h ON ha.hostel_id = h.id';
        let params = [];
        if (hostel_id) {
            query += ' WHERE ha.hostel_id = ? OR ha.hostel_id IS NULL';
            params.push(hostel_id);
        }
        query += ' ORDER BY ha.created_at DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
};

exports.createAnnouncement = async (req, res) => {
    const { hostel_id, title, content, priority } = req.body;
    try {
        await db.query(
            'INSERT INTO hostel_announcements (hostel_id, title, content, priority) VALUES (?, ?, ?, ?)',
            [hostel_id || null, title, content, priority]
        );
        res.json({ message: 'Announcement posted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error posting announcement' });
    }
};

// --- Block-Level Assignment Management ---
exports.getUnassignedHostelStudents = async (req, res) => {
    try {
        // Fetch students with type 'Hostel' who are NOT assigned to any hostel block yet
        const [students] = await db.query(`
            SELECT id, name, register_number, year, email, phone 
            FROM users 
            WHERE role = 'student' 
            AND student_type = 'Hostel' 
            AND hostel_id IS NULL
            ORDER BY year DESC, register_number
        `);
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching unassigned students' });
    }
};

exports.getHostelStudents = async (req, res) => {
    const { hostel_id } = req.params;
    try {
        const [students] = await db.query(`
            SELECT id, name, register_number, year, email, phone 
            FROM users 
            WHERE role = 'student' 
            AND hostel_id = ?
            ORDER BY year DESC, register_number
        `, [hostel_id]);
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching hostel students' });
    }
};

exports.assignStudentToHostel = async (req, res) => {
    const { student_id, hostel_id } = req.body;
    try {
        await db.query('UPDATE users SET hostel_id = ? WHERE id = ?', [hostel_id, student_id]);
        res.json({ message: 'Student assigned to hostel successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error assigning student to hostel' });
    }
};

exports.removeStudentFromHostel = async (req, res) => {
    const { student_id } = req.body;
    try {
        await db.query('UPDATE users SET hostel_id = NULL WHERE id = ?', [student_id]);
        res.json({ message: 'Student removed from hostel successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing student from hostel' });
    }
};
