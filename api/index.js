// api/index.js - Trigger restart 20
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from process.cwd(), api/.env, and root .env
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// If your routes are ESM: import normally.
// If your routes are CommonJS (use require), either convert them or rename to .cjs and import dynamically.
// Try ESM import first:
import apiRoutes from './routes/index.cjs';

const app = express();

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (adjust path if your uploads folder location differs)
const uploadsPath = path.join(__dirname, '../uploads');
if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
}

// Serve built frontend assets in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Database connection cache
let dbConnected = false;

const connectToDatabase = async () => {
    if (dbConnected && mongoose.connection.readyState === 1) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('⚠️ MONGODB_URI is not defined in environment variables');
        return;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 8000,
        });
        dbConnected = true;
        console.log('✓ MongoDB Connected Successfully');
    } catch (error) {
        dbConnected = false;
        console.error('✗ MongoDB Connection Error:', error && (error.message || error));
        const msg = error?.message ?? String(error);
        if (/bad auth|auth(?:entication)? failed/i.test(msg)) {
            console.error('  -> MongoDB authentication failed. Verify dsavio83_db_user password in Atlas.');
        } else if (/whitelist|timed out|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
            console.error('  -> MongoDB Network/IP Whitelist: Ensure MongoDB Atlas has 0.0.0.0/0 allowed in Network Access.');
        }
    }
};

// Mount routes (ensure apiRoutes is ESM default or change accordingly)
app.use('/api', apiRoutes);

// Health check (instant, does not block on external connections)
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : (mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected');
    res.json({
        status: dbState === 'connected' ? 'healthy' : 'degraded',
        database: dbState,
        port: process.env.PORT || 3000,
        timestamp: new Date().toISOString()
    });
});

// Root endpoint & SPA fallback
if (fs.existsSync(distPath)) {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.json({
            message: 'My Class Content Browser API',
            version: '1.0.0',
            status: 'running'
        });
    });
}

// Server startup for direct Node.js execution
export const startServer = async () => {
    try {
        const rawPort = process.env.PORT || 3000;
        const isNumeric = !isNaN(Number(rawPort));
        const port = isNumeric ? Number(rawPort) : rawPort;

        // 1. Immediately bind to port/socket so Hostinger proxy never gets 503
        const server = isNumeric
            ? app.listen(port, '0.0.0.0', () => {
                console.log(`✓ Production Server listening on http://0.0.0.0:${port}`);
                console.log(`✓ Web app available at http://localhost:${port}`);
                console.log(`✓ Health check available at http://localhost:${port}/health`);
                console.log(`✓ API endpoints available at http://localhost:${port}/api`);
            })
            : app.listen(port, () => {
                console.log(`✓ Production Server listening on socket: ${port}`);
            });

        server.on('error', (err) => {
            console.error('Server HTTP listen error:', err && (err.message || err));
        });

        // Increase timeout to 5 minutes for large uploads
        server.setTimeout(5 * 60 * 1000);

        // 2. Connect to database in background
        connectToDatabase().catch((err) => {
            console.error('Database connection failed during startup:', err);
        });

        return server;
    } catch (error) {
        console.error('Failed to bind server port:', error && (error.stack || error));
        throw error;
    }
};

// Serverless handler used by Vercel (default export)
const serverlessHandler = async (req, res) => {
    try {
        await connectToDatabase();
        // Let express handle the request/response
        app(req, res);
    } catch (error) {
        console.error('Serverless handler error:', error && (error.stack || error));
        res.status(500).json({
            error: 'Database connection failed',
            message: error ? (error.message || String(error)) : 'unknown'
        });
    }
};

// If run directly via `node api/index.js`, start the local server
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
    // invoked directly
    startServer();
}

// Export default for Vercel serverless usage
export default serverlessHandler;
export { app, serverlessHandler };
// Trigger restart 13

