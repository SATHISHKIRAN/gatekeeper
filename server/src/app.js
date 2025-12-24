const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('UniVerse GateKeeper API is running');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const requestRoutes = require('./routes/requestRoutes');
app.use('/api/requests', requestRoutes);

const queueRoutes = require('./routes/queueRoutes');
app.use('/api/queue', queueRoutes);

const hodRoutes = require('./routes/hodRoutes');
app.use('/api/hod', hodRoutes);

const wardenRoutes = require('./routes/wardenRoutes');
app.use('/api/warden', wardenRoutes);

const gateRoutes = require('./routes/gateRoutes');
app.use('/api/gate', gateRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

const hostelRoutes = require('./routes/hostelRoutes');
app.use('/api/hostels', hostelRoutes);

const staffRoutes = require('./routes/staffRoutes');
app.use('/api/staff', staffRoutes);

const studentRoutes = require('./routes/studentRoutes');
app.use('/api/student', studentRoutes);

const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);

const systemRoutes = require('./routes/systemRoutes');
app.use('/api/system', systemRoutes);

const path = require('path');
const { runCleanup } = require('./services/systemService');
require('./services/whatsappService');

// --- PRODUCTION: Serve Frontend Static Files ---
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));

// API Routes (Prefix /api)
// ... (all existing app.use('/api/...') remain above or here)

// --- PRODUCTION: Catch-all for SPA (Single Page Application) ---
app.get('*', (req, res) => {
    // Only handle if not an API route
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Run maintenance on boot
    runCleanup();
    console.log('[SYSTEM] WhatsApp service initialization triggered');
});

module.exports = app;