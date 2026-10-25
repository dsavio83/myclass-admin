#!/usr/bin/env node

/**
 * Hostinger Node.js Application Startup File
 */
import { startServer } from './api/index.js';

console.log('🚀 Starting MyClass production server on Hostinger...');
startServer().catch((err) => {
    console.error('Fatal startup error in startServer:', err);
});
