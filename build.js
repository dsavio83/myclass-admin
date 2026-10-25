#!/usr/bin/env node

/**
 * Hostinger Node.js Application Entry Point.
 *
 * This file is an ES module (package.json has "type": "module"). Avoid
 * top-level await here: Hostinger's OpenLiteSpeed Node.js launcher may load
 * the configured entry synchronously via require(). Node.js cannot do that
 * when this module's dependency graph contains top-level await.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hostinger's build step should normally create this file. Keep a synchronous
// fallback for deployments where the built frontend is missing.
const distHtml = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(distHtml)) {
    console.log('📦 Frontend build (dist/index.html) not found. Building with Vite...');
    try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('✅ Vite build completed successfully');
    } catch (err) {
        console.error('❌ Frontend build failed:', err && (err.message || err));
        // Do not silently start a server that cannot serve the expected frontend.
        process.exitCode = 1;
        throw err;
    }
}

console.log('🚀 Starting MyClass application server on Hostinger...');
startServer().catch((err) => {
    console.error('Fatal startup error in startServer:', err && (err.stack || err));
    process.exitCode = 1;
});
