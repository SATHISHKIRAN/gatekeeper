const db = require('./server/src/config/database');
const fs = require('fs');
const path = require('path');

async function testIssuePass() {
    try {
        const payload = {
            name: 'Simulated Visitor',
            phone: '9876543210',
            visitor_type: 'guest',
            company: 'Test Co',
            purpose: 'Simulated Test',
            host_name: 'Dr. Host',
            host_code: 'H001',
            host_department: 'IT',
            id_proof_type: 'Aadhar',
            id_proof_number: '12345678',
            remarks: 'Simulated insertion',
            image: null,
            group_size: 1,
            group_members: []
        };

        const gatekeeper_id = 1; // Existing Admin

        console.log('--- Starting Simulated Insertion ---');

        const [result] = await db.query(`
            INSERT INTO visitor_passes (
                name, phone, visitor_type, company, 
                purpose, host_name, host_code, host_department, 
                id_proof_type, id_proof_number, gatekeeper_id, remarks, image_url,
                group_size, group_details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            payload.name, payload.phone, payload.visitor_type, payload.company,
            payload.purpose, payload.host_name, payload.host_code || null, payload.host_department,
            payload.id_proof_type, payload.id_proof_number, gatekeeper_id, payload.remarks || '', null,
            payload.group_size || 1, JSON.stringify(payload.group_members || [])
        ]);

        console.log('Insertion Success! Pass ID:', result.insertId);
        process.exit(0);
    } catch (err) {
        console.error('--- Insertion FAILED ---');
        console.error('Error Code:', err.code);
        console.error('SQL Message:', err.sqlMessage);
        console.error('Error Message:', err.message);
        console.error(err);
        process.exit(1);
    }
}

testIssuePass();
