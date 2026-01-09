const db = require('../config/database');
const whatsappService = require('../services/whatsappService');

const fs = require('fs');
const path = require('path');

const saveVisitorImage = (base64Data, visitorName) => {
    if (!base64Data) return null;

    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const buffer = Buffer.from(matches[2], 'base64');

        // Sanitize name and generate date-based filename
        const safeName = (visitorName || 'visitor').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const randomId = Math.floor(Math.random() * 1000);
        const filename = `${safeName}_${dateStr}_${randomId}.jpg`;

        // Target: client/public/image/visitor (Relative to server/src/controllers)
        const uploadDir = path.join(__dirname, '../../../client/public/image/visitor');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);

        // Path accessible from frontend public dir
        return `/image/visitor/${filename}`;
    } catch (error) {
        console.error('Image Save Error:', error);
        return null;
    }
};

// Issue a new visitor pass
exports.issuePass = async (req, res) => {
    try {
        const {
            name, phone, visitor_type, company,
            purpose, host_name, host_code, host_department,
            id_proof_type, id_proof_number, remarks, image,
            group_size, group_members
        } = req.body;

        const gatekeeper_id = req.user.id;

        console.log('[DEBUG] Issue Pass Payload:', JSON.stringify({ ...req.body, image: req.body.image ? 'Base64...' : null, gatekeeper_id }, null, 2));

        // Save Image
        const image_url = saveVisitorImage(image, name);

        // Normalize
        const s_name = String(name || 'Unknown');
        const s_phone = String(phone || '');
        const s_type = String(visitor_type || 'guest');
        const s_purpose = String(purpose || 'Meeting');
        const s_size = parseInt(group_size) || 1;

        const [result] = await db.query(`
            INSERT INTO visitor_passes (
                name, phone, visitor_type, company, 
                purpose, host_name, host_code, host_department, 
                id_proof_type, id_proof_number, gatekeeper_id, remarks, image_url,
                group_size, group_details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            s_name, s_phone, s_type, company || null,
            s_purpose, host_name || null, host_code || null, host_department || null,
            id_proof_type || 'Other', id_proof_number || 'N/A', gatekeeper_id, remarks || '', image_url,
            s_size, JSON.stringify(Array.isArray(group_members) ? group_members : [])
        ]);

        const passId = result.insertId;

        // --- Advanced WhatsApp Notification (Entry) ---
        const entryTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const entryMessage = `🎟️ *UniVerse GateKeeper - Visitor Entry*

Hello *${name}*, your digital entry pass is now active.
${group_size > 1 ? `👥 *Group Size:* ${group_size} members` : ''}

📍 *Visiting:* ${host_name || 'Campus'} (${host_department || 'General'})
🏢 *Pass ID:* #${passId}
🕒 *Entry Time:* ${entryTime}
📝 *Purpose:* ${purpose}

---
👋 _Welcome to our Campus. Have a productive stay!_`;

        // Send asynchronously to avoid blocking response
        try {
            if (s_phone && s_phone.length >= 10) {
                whatsappService.sendWhatsApp(s_phone, entryMessage).catch(err => console.error('[WHATSAPP] Visitor Entry Error:', err));
            }
        } catch (e) {
            console.error('[WHATSAPP] Sync Error:', e);
        }

        res.status(201).json({
            message: 'Visitor Pass Issued Successfully',
            passId: passId
        });

    } catch (error) {
        console.error('[CRITICAL ERROR] issuePass:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    }
};

// Mark visitor as checked out
exports.checkoutVisitor = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch visitor details before checkout to send notification
        const [[visitor]] = await db.query('SELECT name, phone FROM visitor_passes WHERE id = ?', [id]);
        if (!visitor) return res.status(404).json({ message: 'Visitor record not found' });


        const [result] = await db.query(`
            UPDATE visitor_passes 
            SET check_out = CURRENT_TIMESTAMP, status = 'completed' 
            WHERE id = ? AND status = 'active'
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Active visitor pass not found' });
        }

        // --- Advanced WhatsApp Notification (Exit) ---
        if (visitor) {
            const exitTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const exitMessage = `👋 *UniVerse GateKeeper - Departure*

Hello *${visitor.name}*, you have successfully checked out of the campus.

🕒 *Departure Time:* ${exitTime}
🏢 *Pass Status:* COMPLETED ✅

---
✨ _Thank you for visiting. Safe travels!_`;

            whatsappService.sendWhatsApp(visitor.phone, exitMessage).catch(err => console.error('[WHATSAPP] Visitor Exit Error:', err));
        }

        res.json({ message: 'Visitor checked out successfully' });

    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ message: 'Error during check-out' });
    }
};

// Get current active visitors
exports.getActiveVisitors = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT v.*, u.name as issued_by
            FROM visitor_passes v
            JOIN users u ON v.gatekeeper_id = u.id
            WHERE v.status = 'active'
            ORDER BY v.check_in DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Get Active Visitors Error:', error);
        res.status(500).json({ message: 'Error fetching active visitors' });
    }
};

// Get visitor stats for today
exports.getTodayStats = async (req, res) => {
    try {
        const [[{ total }]] = await db.query('SELECT COALESCE(SUM(group_size), 0) as total FROM visitor_passes WHERE DATE(check_in) = CURDATE()');
        const [[{ active }]] = await db.query('SELECT COALESCE(SUM(group_size), 0) as active FROM visitor_passes WHERE status = "active"');
        const [byType] = await db.query(`
            SELECT visitor_type, COALESCE(SUM(group_size), 0) as count 
            FROM visitor_passes 
            WHERE DATE(check_in) = CURDATE() 
            GROUP BY visitor_type
        `);

        res.json({
            today_total: total,
            currently_inside: active,
            breakdown: byType
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ message: 'Error fetching visitor stats' });
    }
};

// Get history (with advanced search & pagination)
exports.getHistory = async (req, res) => {
    try {
        const { search, visitor_type, from, to, host_name, status, limit = 10, page = 1 } = req.query;

        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const offset = (pageNum - 1) * limitNum;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereClause += ` AND (v.name LIKE ? OR v.phone LIKE ? OR v.company LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (visitor_type && visitor_type !== 'all') {
            whereClause += ` AND v.visitor_type = ?`;
            params.push(visitor_type);
        }

        if (host_name) {
            whereClause += ` AND v.host_name LIKE ?`;
            params.push(`%${host_name}%`);
        }

        if (status && status !== 'all') {
            whereClause += ` AND v.status = ?`;
            params.push(status);
        }

        if (from) {
            whereClause += ` AND v.check_in >= ?`;
            params.push(`${from} 00:00:00`);
        }

        if (to) {
            whereClause += ` AND v.check_in <= ?`;
            params.push(`${to} 23:59:59`);
        }

        // Get Total Count and Total Persons
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total, COALESCE(SUM(group_size), 0) as total_persons FROM visitor_passes v ${whereClause}`,
            params
        );
        const total = countResult[0].total;
        const total_persons = countResult[0].total_persons;

        // Get Data
        const query = `
            SELECT v.*, u.name as issued_by
            FROM visitor_passes v
            JOIN users u ON v.gatekeeper_id = u.id
            ${whereClause}
            ORDER BY v.check_in DESC 
            LIMIT ? OFFSET ?
        `;

        // Add limit/offset params to the end of existing params array
        const dataParams = [...params, limitNum, offset];
        const [rows] = await db.query(query, dataParams);

        res.json({
            data: rows,
            pagination: {
                total,
                total_persons,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('History Error:', error);
        res.status(500).json({ message: 'Error fetching visitor history' });
    }
};

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

// Host Lookup for Visitor Issuance
exports.hostLookup = async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await db.query(`
            SELECT u.name, d.name as department_name 
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.register_number = ? OR u.id = ?
            LIMIT 1
        `, [id, id]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Host not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Host Lookup Error:', error);
        res.status(500).json({ message: 'Error looking up host' });
    }
};
