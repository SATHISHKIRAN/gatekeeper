const axios = require('axios');
const db = require('../server/config/database');
const { format } = require('date-fns');

const API_URL = 'http://localhost:5000/api';

// Utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('🚀 Starting Medical Override Reproduction Test...');

    let studentId, hodId, wardenId;
    let studentToken, hodToken;
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
        // Mocking token since we don't have the real secret readily available or we can generate one if we had the key.
        // Instead, we'll assume the user is logged in or we can hit the login endpoint if the server is running.
        // For simplicity in this script, we will simulate the API call logic locally or hit the endpoint if server is up.

        // Actually, to truly test the controller, we should hit the API. 
        // Let's assume the server is running on localhost:5000.
        // We need to register/login real users or have a way to generate tokens.
        // Since we inserted users with dummy passwords, we can't login unless we know the hash source. 
        // Better approach: Use the 'reset_password.js' logic to set a known password? 
        // Or just generate a valid token using jsonwebtoken if we know the JWT_SECRET.

        // Let's try to grab JWT_SECRET from .env
        require('dotenv').config({ path: '../server/.env' });
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'your_jwt_secret'; // Fallback if env not loaded

        hodToken = jwt.sign({ id: hodId, role: 'hod', department_id: deptId }, secret, { expiresIn: '1h' });
        // console.log('🔑 Generated HOD Token:', hodToken);

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
            console.error('❌ Medical Override Failed:', error.response?.data || error.message);
            process.exit(1);
        }

        // 4. Verify at Gate (Gate Action) - This is where it should FAIL currently
        console.log('\n🚧 4. Verifying Pass at Gate...');

        // We define a gatekeeper token
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
            }

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('❌ TEST FAILED: Gate returned 404 (Pass not found/valid). This confirms the bug.');
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
        process.exit(0); // Ensure exit
    }
}

runTest();
