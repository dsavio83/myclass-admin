#!/usr/bin/env node

/**
 * Hostinger Node.js Application Entry Point
 * Runs in ES module scope ("type": "module" in package.json)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure frontend dist/index.html exists; if not, build it before starting
const distHtml = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(distHtml)) {
    console.log('📦 Frontend build (dist/index.html) not found. Building with Vite...');
    try {
        const { execSync } = await import('child_process');
        execSync('npm run build', { stdio: 'inherit' });
        console.log('✅ Vite build completed successfully');
    } catch (err) {
        console.warn('⚠️ Frontend auto-build notice:', err && (err.message || err));
    }
}

console.log('🚀 Starting MyClass application server on Hostinger...');
startServer().catch((err) => {
    console.error('Fatal startup error in startServer:', err);
});
