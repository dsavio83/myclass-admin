// api/index.js - Trigger restart 19
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from process.cwd() and api/.env
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Database connection cache (to avoid reconnects on serverless cold starts)
let dbConnected = false;

const connectToDatabase = async () => {
    if (dbConnected) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    try {
        // Provide options for mongoose; adapt if using newer driver settings
        await mongoose.connect(uri, {
            // recommended options (Mongoose 6+ doesn't require useNewUrlParser/UnifiedTopology but leaving safe)
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // serverSelectionTimeoutMS: 5000,
        });
        dbConnected = true;
        console.log('✓ MongoDB Connected Successfully');
    } catch (error) {
        console.error('✗ MongoDB Connection Error:', error && (error.stack || error));
        const msg = error?.message ?? String(error);
        if (/bad auth|auth(?:entication)? failed/i.test(msg)) {
            const shown = uri.replace(/\/\/([^:]+):([^@]*)@/, '//$1:****@');
            console.error(
                '\n' +
                '  ----------------------------------------------------------\n' +
                '  The MongoDB username exists but the PASSWORD is wrong.\n' +
                '  This is a credentials problem, not a code problem.\n' +
                '\n' +
                `  URI in use: ${shown}\n` +
                '\n' +
                '  To fix, in https://cloud.mongodb.com go to\n' +
                '  Database Access -> dsavio83_db_user -> Edit Password\n' +
                '  then update MONGODB_URI in api/.env and save the file.\n' +
                '\n' +
                '  To check your credentials without starting the server:\n' +
                '      node test-db-connection.js\n' +
                '  ----------------------------------------------------------\n'
            );
        }
        throw error;
    }
};

// Mount routes (ensure apiRoutes is ESM default or change accordingly)
app.use('/api', apiRoutes);

// Health check (relative route)
app.get('/health', async (req, res) => {
    try {
        await connectToDatabase();
        const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        res.json({
            status: 'healthy',
            database: dbState,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error ? (error.message || String(error)) : 'unknown',
            timestamp: new Date().toISOString()
        });
    }
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
        await connectToDatabase();
        const PORT = process.env.PORT || 5002;
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✓ Production Server running on port ${PORT}`);
            console.log(`✓ Web app available at http://localhost:${PORT}`);
            console.log(`✓ Health check available at http://localhost:${PORT}/health`);
            console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
        });

        // Increase timeout to 5 minutes for large uploads
        server.setTimeout(5 * 60 * 1000);
    } catch (error) {
        console.error('Failed to start server:', error && (error.stack || error));
        process.exit(1);
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

