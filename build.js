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

console.log('🚀 Starting MyClass application server on Hostinger...');
startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
