'use strict';

// Hostinger/OpenLiteSpeed may load the configured startup file with require().
// Use dynamic import so an ES-module entry point with top-level await can load.
console.log('[Hostinger] Starting MyClass Admin via ESM dynamic import...');

import('./build.js')
  .then(() => {
    console.log('[Hostinger] build.js imported successfully.');
  })
  .catch((error) => {
    console.error('[Hostinger] Failed to import build.js:', error);
    process.exitCode = 1;
  });
