const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: true, // Reflects the request origin, allows any origin for now (useful for dev/debugging)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes Placeholder
// Routes Placeholder (Removed to allow React Frontend to load)


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

const calendarRoutes = require('./routes/calendarRoutes');
app.use('/api/calendar', calendarRoutes);

const policyRoutes = require('./routes/policyRoutes');
app.use('/api/policies', policyRoutes);

const systemRoutes = require('./routes/systemRoutes');
app.use('/api/system', systemRoutes);

const visitorRoutes = require('./routes/visitorRoutes');
app.use('/api/visitors', visitorRoutes);

const principalRoutes = require('./routes/principalRoutes');
app.use('/api/principal', principalRoutes);

const path = require('path');
const { runCleanup } = require('./services/systemService');
require('./services/whatsappService');

// --- Serve Uploaded Files (Images, etc.) ---
const uploadsPath = path.join(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadsPath));

// --- PRODUCTION: Serve Frontend Static Files ---
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));

// API Routes (Prefix /api)
// ... (all existing app.use('/api/...') remain above or here)

// --- PRODUCTION: Catch-all for SPA (Single Page Application) ---
app.get(/.*/, (req, res) => {
    // Only handle if not an API route
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

const { initSocket } = require('./services/socketService');
const http = require('http');

// Create HTTP server for Socket.io
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    // Run maintenance on boot
    runCleanup();

    // Initialize Scheduled Jobs (Cron)
    const { initScheduledJobs } = require('./services/cronService');
    initScheduledJobs();

    // Start Pass Expiration Service (Auto-Expire unused passes)
    const { startExpirationService } = require('./services/passExpirationService');
    startExpirationService();

    console.log('[SYSTEM] WhatsApp service initialization triggered');
});

// Prevent crash on unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Keep running if possible, but logging is critical
});

module.exports = app;
