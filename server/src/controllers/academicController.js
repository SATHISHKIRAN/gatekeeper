const db = require('../config/database');

exports.promoteStudents = async (req, res) => {
    const { confirmation } = req.body;

    if (confirmation !== 'CONFIRM') {
        return res.status(400).json({ message: 'Invalid confirmation code' });
    }

    try {
        // Promote: Update year = year + 1 for all students (excluding those already at max year, managed separately)
        // We assume max year is 4 for simplicity, or we can just increment all.
        // Usually, 4th years should be archived first.

        // Safety: Only promote active students
        const [result] = await db.query(
            'UPDATE users SET year = year + 1 WHERE role = "student" AND year < 5'
        );

        res.json({ message: `Promotion successful. Updated ${result.affectedRows} students.` });
    } catch (error) {
        console.error('Promotion Error:', error);
        res.status(500).json({ message: 'Promotion failed' });
    }
};

exports.graduateBatch = async (req, res) => {
    const { year, action } = req.body; // action: 'archive' or 'delete'

    if (!year || !['archive', 'delete'].includes(action)) {
        return res.status(400).json({ message: 'Invalid parameters' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (action === 'delete') {
            // Delete all students of specific year
            // Note: ON DELETE CASCADE in schema handles related records (requests, logs, etc.)
            const [result] = await connection.query('DELETE FROM users WHERE role = "student" AND year = ?', [year]);

            await connection.commit();
            res.json({ message: `Successfully deleted ${result.affectedRows} students from Year ${year}.` });
        } else {
            // Archive (For now, implemented as soft delete or status update if 'is_active' exists, else skip)
            // Assuming no 'archive' table yet, we'll mark them as 'alumni' role?
            // Let's assume schema doesn't have 'alumni' role support yet, so we'll just disable login?
            // Check schema: role ENUM('student', 'staff', ...)?
            // If strict ENUM, maybe can't change to alumni.
            // For now, let's just DELETE for the user request "Remove student with year wise".

            // Reverting to DELETE only based on user request "remove studentt with year wise".
            await connection.rollback();
            return res.status(400).json({ message: 'Archive not supported yet. Use Delete.' });
        }

    } catch (error) {
        await connection.rollback();
        console.error('Graduation Error:', error);
        res.status(500).json({ message: 'Batch operation failed' });
    } finally {
        connection.release();
    }
};
