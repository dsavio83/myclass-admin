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

// MongoDB connection manager. Share one in-flight connection attempt across
// startup and incoming API requests so Mongoose queries do not sit in its buffer.
let dbConnectPromise = null;

const connectToDatabase = async () => {
    if (mongoose.connection.readyState === 1) return;

    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
        throw new Error('MONGODB_URI is missing from the runtime environment');
    }

    if (!dbConnectPromise) {
        dbConnectPromise = mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        })
            .then(() => {
                console.log('✓ MongoDB Connected Successfully');
            })
            .catch((error) => {
                // Do not log the connection string; it may contain credentials.
                console.error('✗ MongoDB Connection Error:', `${error?.name || 'Error'}: ${error?.message || error}`);
                throw error;
            })
            .finally(() => {
                dbConnectPromise = null;
            });
    }

    await dbConnectPromise;
};

// Gate database-backed API requests on a real connection. This converts the
// confusing Mongoose buffering timeout into a useful 503 and preserves details
// in the server logs for diagnosing Atlas credentials/network access.
app.use('/api', async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        const message = error?.message || String(error);
        console.error(`[API DB gate] ${req.method} ${req.originalUrl}: ${error?.name || 'Error'}: ${message}`);
        res.status(503).json({
            success: false,
            message: message.includes('MONGODB_URI is missing')
                ? 'Database configuration is missing on the server.'
                : 'Database is unavailable. Check the server runtime logs and MongoDB Atlas connection settings.'
        });
    }
});

// Mount routes only after the database gate middleware.
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
    app.get('/{*splat}', (req, res, next) => {
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
