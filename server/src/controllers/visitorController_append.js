const db = require('../config/database');
// ... existing code ...

// --- Contract Worker Management ---

// Create New Contract Pass
exports.createContractPass = async (req, res) => {
    try {
        const { name, phone, role, company, department, valid_until } = req.body;
        const [result] = await db.query(`
            INSERT INTO contract_passes (name, phone, role, company, department, valid_from, valid_until, status)
            VALUES (?, ?, ?, ?, ?, CURDATE(), ?, 'active')
        `, [name, phone, role, company, department, valid_until || null]);

        res.status(201).json({ message: 'Contract Pass Created', id: result.insertId });
    } catch (error) {
        console.error('Create Contract Pass Error:', error);
        res.status(500).json({ message: 'Error creating pass' });
    }
};

// Get All Contract Passes
exports.getContractPasses = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contract_passes ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Get Contract Passes Error:', error);
        res.status(500).json({ message: 'Error fetching passes' });
    }
};

// Toggle Entry/Exit for Contract Log
exports.toggleContractEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const gatekeeper_id = req.user.id;

        const [passes] = await db.query('SELECT current_state, name, phone FROM contract_passes WHERE id = ?', [id]);
        if (passes.length === 0) return res.status(404).json({ message: 'Pass not found' });

        const pass = passes[0];
        const newAction = pass.current_state === 'in' ? 'check_out' : 'check_in';
        const newState = pass.current_state === 'in' ? 'out' : 'in';

        await db.query(`
            INSERT INTO contract_logs (pass_id, gatekeeper_id, action)
            VALUES (?, ?, ?)
        `, [id, gatekeeper_id, newAction]);

        await db.query(`
            UPDATE contract_passes 
            SET current_state = ?, last_active = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newState, id]);

        res.json({ message: `Worker Marked ${newState.toUpperCase()}`, newState });
    } catch (error) {
        console.error('Toggle Contract Error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

// Get History for a specific pass
exports.getContractHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT l.*, u.name as gatekeeper_name 
            FROM contract_logs l
            JOIN users u ON l.gatekeeper_id = u.id
            WHERE l.pass_id = ?
            ORDER BY l.timestamp DESC
        `, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Contract History Error:', error);
        res.status(500).json({ message: 'Error fetching history' });
    }
};
