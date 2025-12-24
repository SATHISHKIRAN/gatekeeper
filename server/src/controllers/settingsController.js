const db = require('../config/database');

exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings WHERE id = 1');
        if (rows.length === 0) {
            // Should be seeded, but just in case
            return res.json({ app_name: 'UniVerse', theme_primary: '#4F46E5' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const {
            app_name,
            app_description,
            app_logo,
            theme_primary,
            theme_secondary,
            maintenance_mode,
            allow_registration,
            announcement_text
        } = req.body;

        await db.query(`
            UPDATE settings 
            SET app_name = ?, 
                app_description = ?, 
                app_logo = ?, 
                theme_primary = ?, 
                theme_secondary = ?,
                maintenance_mode = ?,
                allow_registration = ?,
                announcement_text = ?
            WHERE id = 1
        `, [
            app_name,
            app_description,
            app_logo,
            theme_primary,
            theme_secondary,
            maintenance_mode,
            allow_registration,
            announcement_text
        ]);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating settings' });
    }
};
