import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // ... existing server config ...
    server: {
      port: 3001,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Learning Platform',
          short_name: 'LearnPlatform',
          description: 'A comprehensive learning platform for students and teachers',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'vite.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'vite.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // React and React DOM
            'react-vendor': ['react', 'react-dom'],
            // PDF.js library
            'pdfjs': ['pdfjs-dist'],
            // API and utilities (only browser-compatible packages)
            'api-vendor': ['axios', 'form-data'],
            // Node.js built-ins (exclude from bundle)
            'node-builtins': ['path']
          },
          // Configure chunk file names for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Increase warning limit for chunks
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
