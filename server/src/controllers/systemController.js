const os = require('os');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Convert bytes to GB
const toGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

exports.getSystemStats = async (req, res) => {
    try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        // Calculate CPU Usage (Primitive snapshot)
        // For real accuracy we'd need two snapshots, but for this simpler version we'll just return load avg for unix or 0 for windows if not available
        // Better approach: Calculate idle time vs total time across all cores
        let idle = 0;
        let total = 0;
        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                total += cpu.times[type];
            }
            idle += cpu.times.idle;
        });

        // This is cumulative since boot, so it's not "current" usage.
        // For a true "live" feel without websockets/intervals on backend, we can just send the loadavg
        // Windows doesn't always support loadavg correctly in node, so we use a fallback
        const loadAvg = os.loadavg(); // [1, 5, 15] min averages

        const stats = {
            os: {
                platform: os.platform(),
                release: os.release(),
                type: os.type(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: os.uptime() // Seconds
            },
            cpu: {
                model: cpus[0].model,
                cores: cpus.length,
                speed: cpus[0].speed,
                loadParams: loadAvg // Windows might return [0,0,0]
            },
            memory: {
                total: toGB(totalMem),
                free: toGB(freeMem),
                used: toGB(usedMem),
                processMemory: toGB(process.memoryUsage().rss)
            },
            serverTime: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        console.error('System Stats Error:', error);
        res.status(500).json({ message: 'Failed to fetch system stats' });
    }
};

exports.getSystemLogs = async (req, res) => {
    try {
        const logPath = path.join(__dirname, '../../gate_error.log');

        if (!fs.existsSync(logPath)) {
            return res.json({ logs: [] });
        }

        // Read last 200 lines roughly
        const stats = fs.statSync(logPath);
        const fileSize = stats.size;
        const bufferSize = 100 * 1024; // 100KB
        const start = Math.max(0, fileSize - bufferSize);

        const stream = fs.createReadStream(logPath, { start, end: fileSize });
        let data = '';

        stream.on('data', (chunk) => {
            data += chunk;
        });

        stream.on('end', () => {
            const lines = data.split('\n').filter(line => line.trim() !== '');
            // Limit to last 100
            const lastLogs = lines.slice(-100).reverse();
            res.json({ logs: lastLogs });
        });

        stream.on('error', (err) => {
            throw err;
        });

    } catch (error) {
        console.error('Log Read Error:', error);
        res.status(500).json({ message: 'Failed to read logs' });
    }
};
