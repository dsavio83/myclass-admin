import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let frontend = null;
let backend = null;
let isRestarting = false;

/**
 * Free port if it is in use by another process
 */
function freePort(port) {
    try {
        if (process.platform === 'win32') {
            const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { 
                encoding: 'utf-8', 
                stdio: ['pipe', 'pipe', 'ignore'] 
            });
            const lines = output.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid) && parseInt(pid) > 0 && parseInt(pid) !== process.pid) {
                    try {
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        console.log(`\x1b[33mFreed port ${port} (terminated PID ${pid})\x1b[0m`);
                    } catch (_) {}
                }
            }
        }
    } catch (_) {}
}

/**
 * Starts both frontend and backend servers.
 * If either fails with an error code, both are stopped and restarted.
 */
function startServers() {
    isRestarting = false;
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', '==============================================');
    console.log('\x1b[36m%s\x1b[0m', '🚀  My Class Content Browser - Dev System  🚀');
    console.log('\x1b[36m%s\x1b[0m', '==============================================');
    console.log('\x1b[90m%s\x1b[0m', `Started at: ${new Date().toLocaleTimeString()}`);
    console.log('');

    // Ensure ports are free before starting
    freePort(3001);
    freePort(5001);

    // Start Frontend (Vite)
    console.log('\x1b[32m%s\x1b[0m', '📦 Starting Frontend...');
    frontend = spawn('npm', ['run', 'dev'], { 
        stdio: 'inherit', 
        shell: true 
    });

    // Start Backend (Express with Nodemon)
    console.log('\x1b[32m%s\x1b[0m', '🖥️  Starting Backend...');
    backend = spawn('npm', ['run', 'dev:api'], { 
        stdio: 'inherit', 
        shell: true 
    });

    const handleExit = (name, code) => {
        if (!isRestarting && code !== 0 && code !== null) {
            console.log('\n\x1b[31m%s\x1b[0m', '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.log('\x1b[31m%s\x1b[0m', `⚠️  CRITICAL: ${name} server crashed (Code: ${code})`);
            console.log('\x1b[31m%s\x1b[0m', '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            restartAll();
        }
    };

    frontend.on('exit', (code) => handleExit('Frontend', code));
    backend.on('exit', (code) => handleExit('Backend', code));
    
    frontend.on('error', (err) => {
        console.error('\x1b[31m%s\x1b[0m', 'Frontend Spawn Error:', err);
        restartAll();
    });

    backend.on('error', (err) => {
        console.error('\x1b[31m%s\x1b[0m', 'Backend Spawn Error:', err);
        restartAll();
    });
}

/**
 * Stops all processes and triggers a fresh start.
 */
function restartAll() {
    if (isRestarting) return;
    isRestarting = true;

    console.log('\x1b[33m%s\x1b[0m', '\n🔄 RESTARTING ALL SERVICES...');
    console.log('\x1b[90m%s\x1b[0m', 'Stopping processes and cleaning up...');

    if (frontend) frontend.kill('SIGTERM');
    if (backend) backend.kill('SIGTERM');

    // Give it a moment to breathe before restarting
    setTimeout(() => {
        freePort(3001);
        freePort(5001);
        startServers();
    }, 3000);
}

// Handle manual termination (Ctrl+C)
process.on('SIGINT', () => {
    isRestarting = true;
    console.log('\n\x1b[32m%s\x1b[0m', '👋 Shutting down all servers. Goodbye!');
    if (frontend) frontend.kill();
    if (backend) backend.kill();
    process.exit(0);
});

// Initial start
startServers();
