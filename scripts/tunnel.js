const { spawn } = require('child_process');
const https = require('https');

console.log('Fetching your Public IP for Localtunnel Password...');

// 1. Get Public IP
https.get('https://api.ipify.org', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const ip = data.trim();
        console.log('\n================================================================');
        console.log('  🔒 LOCAL TUNNEL SECURITY CHECK');
        console.log('================================================================');
        console.log(`  Your Tunnel Password is:  \x1b[32m${ip}\x1b[0m`);
        console.log('  (Copy this IP and paste it into the "Endpoint IP" box on your phone)');
        console.log('================================================================\n');

        // 2. Start Localtunnel
        const lt = spawn('npx', ['localtunnel', '--port', '5173'], { stdio: 'inherit', shell: true });

        lt.on('close', (code) => {
            console.log(`Localtunnel process exited with code ${code}`);
        });
    });
}).on('error', (err) => {
    console.error('Failed to get public IP:', err.message);
    console.log('Starting tunnel anyway...');
    spawn('npx', ['localtunnel', '--port', '5173'], { stdio: 'inherit', shell: true });
});
