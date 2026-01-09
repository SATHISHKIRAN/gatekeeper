const db = require('../config/database');

exports.getEvents = async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM calendar_events ORDER BY start_date ASC');
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching events' });
    }
};

exports.addEvent = async (req, res) => {
    const { title, start_date, end_date, type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['hod', 'warden', 'principal', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Unauthorized: Only HOD, Warden, or Principal can manage calendar.' });
    }

    try {
        await db.query(
            'INSERT INTO calendar_events (title, start_date, end_date, type, created_by) VALUES (?, ?, ?, ?, ?)',
            [title, start_date, end_date || start_date, type || 'holiday', userId]
        );
        res.json({ message: 'Event added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding event' });
    }
};

exports.deleteEvent = async (req, res) => {
    const { id } = req.params;
    const userRole = req.user.role;

    if (!['hod', 'warden', 'principal', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        await db.query('DELETE FROM calendar_events WHERE id = ?', [id]);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting event' });
    }
};
