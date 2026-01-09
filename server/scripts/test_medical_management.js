const axios = require('axios');
const db = require('../src/config/database');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        console.log('--- Medical Override Management Test ---');

        // 1. Get HOD Token
        const [hods] = await db.query('SELECT * FROM users WHERE role = "hod" LIMIT 1');
        if (hods.length === 0) throw new Error('No HOD found');
        const hod = hods[0];
        const token = jwt.sign({ id: hod.id, role: 'hod', department_id: hod.department_id }, process.env.JWT_SECRET);

        console.log(`✅ HOD Authenticated: ${hod.name}`);

        // 2. Get a Student (Target)
        const [students] = await db.query('SELECT * FROM users WHERE role = "student" AND department_id = ? LIMIT 1', [hod.department_id]);
        if (students.length === 0) throw new Error('No Student found in HOD dept');
        const student = students[0];

        // 3. Issue Override (POST)
        console.log('👉 Issuing Override...');
        const createRes = await axios.post(`${API_URL}/hod/medical-override`, {
            studentEmail: student.email,
            reason: 'Test Medical Reason'
        }, { headers: { Authorization: `Bearer ${token}` } });

        const requestId = createRes.data.requestId;
        console.log(`✅ Created Override ID: ${requestId}`);

        // 4. Fetch List (GET)
        console.log('👉 Fetching Overrides...');
        const listRes = await axios.get(`${API_URL}/hod/medical-overrides`, { headers: { Authorization: `Bearer ${token}` } });
        const exists = listRes.data.find(r => r.id === requestId);

        if (!exists) throw new Error('Created override not found in list!');
        console.log(`✅ Override found in list. Total: ${listRes.data.length}`);

        // 5. Update Override (PUT)
        console.log('👉 Updating Override...');
        await axios.put(`${API_URL}/hod/medical-override/${requestId}`, {
            reason: 'Updated Reason 123',
            departure_date: new Date().toISOString(),
            return_date: new Date(Date.now() + 86400000).toISOString()
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Update successful');

        // Verify Update
        const verifyUpdateRes = await axios.get(`${API_URL}/hod/medical-overrides`, { headers: { Authorization: `Bearer ${token}` } });
        const updatedReq = verifyUpdateRes.data.find(r => r.id === requestId);
        if (updatedReq.reason !== 'Updated Reason 123') throw new Error('Update verification failed!');
        console.log('✅ Update verified in DB');

        // 6. Delete/Cancel Override (DELETE)
        console.log('👉 Deleting (Revoking) Override...');
        await axios.delete(`${API_URL}/hod/medical-override/${requestId}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Delete successful');

        // Verify Deletion (Status should be cancelled, might still appear in list depending on query logic)
        // Note: My query fetches approved_hod or critical. If cancelled, it should disappear from the list.
        const verifyDeleteRes = await axios.get(`${API_URL}/hod/medical-overrides`, { headers: { Authorization: `Bearer ${token}` } });
        const deletedReq = verifyDeleteRes.data.find(r => r.id === requestId);

        if (deletedReq) {
            console.log('⚠️ Request still in list (Check query logic). Status:', deletedReq.status);
            if (deletedReq.status !== 'cancelled') throw new Error('Status not updated to cancelled!');
        } else {
            console.log('✅ Request removed from active overrides list.');
        }

        console.log('🎉 ALL TESTS PASSED');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

runTest();
