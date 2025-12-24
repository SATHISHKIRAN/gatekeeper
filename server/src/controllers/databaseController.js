const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const XLSX = require('xlsx');

exports.getBackup = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        // Default to all time if not specified
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const workbook = XLSX.utils.book_new();
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

        // 1. Users (Always included unless specific category filtering prevents it, generally safe to keep)
        // If 'category' param exists and isn't 'users', maybe skip? Let's just include core data always or allow 'all'.
        if (!category || category === 'all' || category === 'users') {
            const [users] = await db.query('SELECT * FROM users');
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(users), 'Users');
        }

        // 2. Requests (Filtered by Date)
        if (!category || category === 'all' || category === 'requests') {
            const [requests] = await db.query('SELECT * FROM requests WHERE created_at BETWEEN ? AND ?', [start, end]);
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(requests), 'Requests');
        }

        // 3. Logs (Filtered by Date)
        if (!category || category === 'all' || category === 'logs') {
            const [logs] = await db.query('SELECT * FROM logs WHERE timestamp BETWEEN ? AND ?', [start, end]);
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logs), 'Logs');
        }

        // 4. Trust History (Filtered by Date)
        if (!category || category === 'all' || category === 'trust') {
            // Check if table has created_at, schema usually does
            const [trustHistory] = await db.query('SELECT * FROM trust_history WHERE created_at BETWEEN ? AND ?', [start, end]);
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trustHistory), 'Trust Scores');
        }

        // 5. Infrastructure (Departments, Hostels) - Static data, useful for context
        if (!category || category === 'all' || category === 'system') {
            const [departments] = await db.query('SELECT * FROM departments');
            const [hostels] = await db.query('SELECT * FROM hostels');
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(departments), 'Departments');
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hostels), 'Hostels');
        }

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `gate_backup_${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename = ${filename} `);
        res.send(buffer);

    } catch (error) {
        console.error('Backup Error:', error);
        res.status(500).json({ message: 'Backup failed' });
    }
};

exports.resetDatabase = async (req, res) => {
    const { mode, confirmation } = req.body;

    if (confirmation !== 'CONFIRM') {
        return res.status(400).json({ message: 'Invalid confirmation code' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (mode === 'prune') {
            // Delete logs/requests/notifications/trust_history older than 6 months
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            await connection.query('DELETE FROM logs WHERE timestamp < ?', [sixMonthsAgo]);
            await connection.query('DELETE FROM requests WHERE created_at < ?', [sixMonthsAgo]);
            await connection.query('DELETE FROM notifications WHERE created_at < ?', [sixMonthsAgo]);
            await connection.query('DELETE FROM trust_history WHERE created_at < ?', [sixMonthsAgo]);

        } else if (mode === 'operational') {
            // New Semester Reset
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            await connection.query('TRUNCATE TABLE logs');
            await connection.query('TRUNCATE TABLE requests');
            await connection.query('TRUNCATE TABLE notifications');
            await connection.query('TRUNCATE TABLE trust_history');
            await connection.query('TRUNCATE TABLE maintenance_requests');
            // Reset Trust Scores
            await connection.query('UPDATE users SET trust_score = 100 WHERE role = "student"');
            // Reset Pass Blocked status
            await connection.query('UPDATE users SET pass_blocked = 0 WHERE role = "student"');
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        } else if (mode === 'full') {
            // Factory Reset (Keep only Admin)
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            await connection.query('TRUNCATE TABLE logs');
            await connection.query('TRUNCATE TABLE requests');
            await connection.query('TRUNCATE TABLE hostel_assignments');
            await connection.query('TRUNCATE TABLE notifications');
            await connection.query('TRUNCATE TABLE trust_history');
            await connection.query('TRUNCATE TABLE maintenance_requests');
            await connection.query('TRUNCATE TABLE proxy_settings');

            // Delete all non-admin users
            await connection.query('DELETE FROM users WHERE role != "admin"');
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } else {
            throw new Error('Invalid reset mode');
        }

        await connection.commit();
        res.json({ message: `System reset successful(Mode: ${mode})` });

    } catch (error) {
        await connection.rollback();
        console.error('Reset Error:', error);
        res.status(500).json({ message: 'Database reset failed' });
    } finally {
        connection.release();
    }
};
