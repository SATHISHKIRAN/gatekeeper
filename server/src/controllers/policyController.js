const db = require('../config/database');

// GET ALL POLICIES
exports.getPolicies = async (req, res) => {
    try {
        const [policies] = await db.query('SELECT * FROM pass_policies ORDER BY student_type, pass_type');
        res.json(policies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching policies' });
    }
};

// CREATE POLICY
exports.createPolicy = async (req, res) => {
    const {
        student_type, pass_type,
        working_start, working_end,
        holiday_behavior, holiday_start, holiday_end,
        gate_action, max_duration_hours
    } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

    try {
        await db.query(`
            INSERT INTO pass_policies 
            (student_type, pass_type, working_start, working_end, holiday_behavior, holiday_start, holiday_end, gate_action, max_duration_hours)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            student_type, pass_type,
            working_start || null, working_end || null,
            holiday_behavior || 'block', holiday_start || null, holiday_end || null,
            gate_action || 'scan_exit', max_duration_hours || null
        ]);
        res.json({ message: 'Policy created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Policy for this Pass Type and Student Type already exists.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error creating policy' });
    }
};

// UPDATE POLICY
exports.updatePolicy = async (req, res) => {
    const { id } = req.params;
    const {
        working_start, working_end,
        holiday_behavior, holiday_start, holiday_end,
        gate_action, max_duration_hours
    } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

    try {
        await db.query(`
            UPDATE pass_policies 
            SET working_start = ?, working_end = ?, 
                holiday_behavior = ?, holiday_start = ?, holiday_end = ?,
                gate_action = ?, max_duration_hours = ?
            WHERE id = ?
        `, [
            working_start || null, working_end || null,
            holiday_behavior, holiday_start || null, holiday_end || null,
            gate_action, max_duration_hours || null,
            id
        ]);

        res.json({ message: 'Policy updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating policy' });
    }
};

// DELETE POLICY
exports.deletePolicy = async (req, res) => {
    const { id } = req.params;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

    try {
        await db.query('DELETE FROM pass_policies WHERE id = ?', [id]);
        res.json({ message: 'Policy deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting policy' });
    }
};

// GET ACTIVE PASS TYPES (For Student Dropdown)
exports.getStudentPassTypes = async (req, res) => {
    const userId = req.user.id;
    try {
        // Fetch user type first
        const [users] = await db.query('SELECT student_type FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const rawType = users[0].student_type || 'Day Scholar';
        const typeKey = rawType.toLowerCase().includes('day') ? 'Day Scholar' : 'Hostel';

        const [policies] = await db.query('SELECT pass_type, working_start, working_end, holiday_behavior FROM pass_policies WHERE student_type = ?', [typeKey]);
        res.json(policies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching pass types' });
    }
};

// Helper
exports.getPolicyForRequest = async (studentType, passType) => {
    try {
        const typeClean = studentType.toLowerCase().includes('day') ? 'Day Scholar' : 'Hostel';
        const [rows] = await db.query('SELECT * FROM pass_policies WHERE student_type = ? AND pass_type = ?', [typeClean, passType]);
        return rows.length > 0 ? rows[0] : null;
    } catch (e) {
        return null;
    }
};
