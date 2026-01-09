const axios = require('axios');
const path = require('path');
const db = require('../src/config/database');
// const { format } = require('date-fns'); // Removed unused dependency

// Load env relative to this script
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';

// Utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('🚀 Starting Medical Override Reproduction Test...');

    let studentId, hodId;
    let hodToken;
    const testEmail = 'hostelite_med_test@universe.com';
    const testRegNo = 'MEDTEST001';
    const hodEmail = 'hod_med_test@universe.com';

    try {
        // 1. Setup Data (Direct DB)
        // Clean up
        await db.query('DELETE FROM users WHERE email IN (?, ?)', [testEmail, hodEmail]);
        await db.query('DELETE FROM departments WHERE name = "MedicalTestDept"');
        await db.query('DELETE FROM hostels WHERE name = "MedicalTestHostel"');

        // Create Dept
        const [dept] = await db.query('INSERT INTO departments (name) VALUES ("MedicalTestDept")');
        const deptId = dept.insertId;

        // Create Hostel
        const [hostel] = await db.query('INSERT INTO hostels (name, type) VALUES ("MedicalTestHostel", "Boys")');
        const hostelId = hostel.insertId;

        // Create HOD
        const [hodUser] = await db.query(`
            INSERT INTO users (name, email, password_hash, role, department_id, created_at) 
            VALUES ("HOD MedTest", ?, "$2b$10$YourHashedPasswordHere", "hod", ?, NOW())
        `, [hodEmail, deptId]);
        hodId = hodUser.insertId;

        // Create Hostelite Student
        const [studentUser] = await db.query(`
            INSERT INTO users (name, email, password_hash, role, department_id, hostel_id, register_number, student_type, created_at) 
            VALUES ("Student MedTest", ?, "$2b$10$YourHashedPasswordHere", "student", ?, ?, ?, "Hostel", NOW())
        `, [testEmail, deptId, hostelId, testRegNo]);
        studentId = studentUser.insertId;

        console.log('✅ Test Data Seeded: HOD ID:', hodId, 'Student ID:', studentId);

        // 2. Login HOD to get Token
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'your_jwt_secret';

        hodToken = jwt.sign({ id: hodId, role: 'hod', department_id: deptId }, secret, { expiresIn: '1h' });

        // 3. Issue Medical Override (HOD Action)
        console.log('\n🏥 3. Issuing Medical Override via API...');
        try {
            const res = await axios.post(`${API_URL}/hod/medical-override`, {
                studentEmail: testEmail,
                reason: 'Critical Appendicitis Checkup'
            }, {
                headers: { Authorization: `Bearer ${hodToken}` }
            });
            console.log('✅ Medical Override Success:', res.data);
        } catch (error) {
            console.error('❌ Medical Override Failed (API):', error.response?.data || error.message);
            process.exit(1);
        }

        // 3.5 Verify Database State (Debug)
        console.log('\n🔍 3.5 Checking Database State...');
        const [requests] = await db.query('SELECT * FROM requests WHERE user_id = ?', [studentId]);
        console.log('Created Requests in DB:', JSON.stringify(requests, null, 2));
        if (requests.length === 0) console.error('!!! NO REQUESTS FOUND IN DB !!!');

        // 4. Verify at Gate (Gate Action)
        console.log('\n🚧 4. Verifying Pass at Gate...');

        const gateToken = jwt.sign({ id: 999, role: 'gatekeeper' }, secret, { expiresIn: '1h' });

        try {
            const gateRes = await axios.post(`${API_URL}/gate/verify-pass`, {
                regNo: testRegNo
            }, {
                headers: { Authorization: `Bearer ${gateToken}` }
            });

            console.log('Gate Response:', gateRes.data);

            if (gateRes.data.status === 'valid' && gateRes.data.allowedActions.includes('exit')) {
                console.log('✅ TEST PASSED: Gate allowed exit for Hostelite with HOD Override.');
            } else {
                console.log('❌ TEST FAILED: Gate did not allow exit. Status:', gateRes.data.status);
                console.log('Allowed Actions:', gateRes.data.allowedActions);
            }

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('❌ TEST FAILED: Gate returned 404 (Pass not found/valid). This confirms the bug.');
                console.log('Error Message:', error.response.data.message);
            } else {
                console.error('❌ Gate Verification Error:', error.response?.data || error.message);
            }
        }

    } catch (err) {
        console.error('Test Script Error:', err);
    } finally {
        // Cleanup
        await db.query('DELETE FROM users WHERE email IN (?, ?)', [testEmail, hodEmail]);
        await db.query('DELETE FROM departments WHERE name = "MedicalTestDept"');
        await db.query('DELETE FROM hostels WHERE name = "MedicalTestHostel"');
        process.exit(0);
    }
}

runTest();
