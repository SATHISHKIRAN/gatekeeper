const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('../src/config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

async function testProfiler(regNo) {
    console.log(`🔍 Testing Profiler for ${regNo}...`);

    // 2. Get Student ID First
    const [students] = await db.query('SELECT id, department_id FROM users WHERE register_number = ?', [regNo]);
    if (students.length === 0) { console.error('Student not found'); process.exit(1); }
    const student = students[0];

    // 1. Get Matching HOD Context
    // We assume the HOD created in the test script (or existing one) is linked to the student's dept
    const [hods] = await db.query('SELECT id, department_id FROM users WHERE role="hod" AND department_id = ? LIMIT 1', [student.department_id]);
    if (hods.length === 0) {
        console.error(`No HOD found for Dept ID ${student.department_id}`);
        process.exit(1);
    }
    const hod = hods[0];
    const token = jwt.sign({ id: hod.id, role: 'hod', department_id: hod.department_id }, SECRET);

    const studentId = student.id;

    // 2.5 SIMULATE EXIT (Force status active)
    console.log('⚡ Simulating Exit Scan...');
    const [updateResult] = await db.query('UPDATE requests SET status = ? WHERE user_id = ?', ['active', studentId]); // Parameterized
    console.log('Update Result:', updateResult);

    const [reqs] = await db.query('SELECT * FROM requests WHERE user_id = ?', [studentId]);
    console.log('Current Requests DB State:', JSON.stringify(reqs, null, 2));

    // 3. Call Profiler API
    try {
        const res = await axios.get(`${API_URL}/hod/student-profile/${studentId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Profiler Response Status:', res.status);
        if (res.data.active_pass) {
            console.log('✅ Active Pass Data Found:', res.data.active_pass);
        } else {
            console.log('❌ Active Pass Data MISSING (Expected if student is active/outside)');
            console.log('Full Response Keys:', Object.keys(res.data));
            console.log('Student Info:', res.data.student);
        }

    } catch (err) {
        console.error('❌ API Error:', err.response?.data || err.message);
    }
    process.exit(0);
}

testProfiler('MEDTEST001');
