const db = require('./src/config/database');

async function initPolicyDB() {
    try {
        console.log('Initializing Pass Policies Table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS pass_policies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_type ENUM('Day Scholar', 'Hostel') NOT NULL,
                pass_type VARCHAR(50) NOT NULL,
                
                working_start TIME DEFAULT NULL,
                working_end TIME DEFAULT NULL,
                
                holiday_behavior ENUM('block', 'allow', 'custom_time') DEFAULT 'block',
                holiday_start TIME DEFAULT NULL,
                holiday_end TIME DEFAULT NULL,
                
                gate_action ENUM('scan_exit', 'scan_both', 'no_scan', 'no_exit') DEFAULT 'scan_exit',
                max_duration_hours INT DEFAULT NULL,
                
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_policy (student_type, pass_type)
            );
        `);

        console.log('Seeding Default Policies...');

        const policies = [
            // Day Scholar Rules
            {
                student_type: 'Day Scholar', pass_type: 'Permission',
                working_start: '09:00:00', working_end: '17:00:00',
                holiday_behavior: 'block',
                gate_action: 'scan_exit'
            },
            {
                student_type: 'Day Scholar', pass_type: 'Leave',
                working_start: '00:00:00', working_end: '23:59:59', // Anytime
                holiday_behavior: 'block',
                gate_action: 'no_scan'
            },
            {
                student_type: 'Day Scholar', pass_type: 'On Duty',
                working_start: '00:00:00', working_end: '23:59:59',
                holiday_behavior: 'block',
                gate_action: 'no_scan'
            },

            // Hostel Rules
            {
                student_type: 'Hostel', pass_type: 'Permission',
                working_start: '09:00:00', working_end: '17:00:00',
                holiday_behavior: 'block',
                gate_action: 'no_exit' // Access Internal Only
            },
            {
                student_type: 'Hostel', pass_type: 'Outing',
                working_start: '17:00:00', working_end: '21:00:00',
                holiday_behavior: 'custom_time',
                holiday_start: '06:00:00', holiday_end: '20:00:00',
                gate_action: 'scan_both',
                max_duration_hours: 12
            },
            {
                student_type: 'Hostel', pass_type: 'Emergency',
                working_start: '00:00:00', working_end: '23:59:59',
                holiday_behavior: 'allow',
                gate_action: 'scan_both'
            }
        ];

        for (const p of policies) {
            await db.query(`
                INSERT IGNORE INTO pass_policies 
                (student_type, pass_type, working_start, working_end, holiday_behavior, holiday_start, holiday_end, gate_action, max_duration_hours)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                p.student_type, p.pass_type,
                p.working_start || null, p.working_end || null,
                p.holiday_behavior,
                p.holiday_start || null, p.holiday_end || null,
                p.gate_action, p.max_duration_hours || null
            ]);
        }

        console.log('Pass Policies Seeded Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
}

initPolicyDB();
