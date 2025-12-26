import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

// Import modular routes from server/ using CommonJS require (server files moved outside /api to avoid Vercel function count limit)
import { createRequire } from 'module';
const requireC = createRequire(import.meta.url);
let serverRoutes;
try {
  // require the routes (CommonJS .cjs) from server/routes/index.cjs
  serverRoutes = requireC('../server/routes/index.cjs');
  if (serverRoutes && serverRoutes.default) serverRoutes = serverRoutes.default;
  // if the exported thing is an express Router, mount it under /api
  if (serverRoutes && typeof serverRoutes === 'function') {
    app.use('/api', serverRoutes);
    console.log('Mounted server routes from ../server/routes/index.cjs under /api');
  }
} catch (e) {
  console.log('No external server routes mounted:', e && (e.stack || e));
}


// Simple Mongo client wrapper (single connection)
let client;
let clientPromise;
const uri = process.env.MONGODB_URI || '';
if (!uri) {
  console.warn('MONGODB_URI not defined — endpoints will return 503 unless set in Vercel env vars.');
}
const connect = async () => {
  if (!uri) throw new Error('MONGODB_URI not set');
  if (!clientPromise) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect();
  }
  await clientPromise;
  return client;
};

// Health check
app.get('/api/health', async (req, res) => {
  if (!process.env.MONGODB_URI) {
    return res.json({ status: 'ok', database: 'not_configured' });
  }
  try {
    const c = await connect();
    const admin = c.db().admin();
    const info = await admin.ping();
    res.json({ status: 'ok', database: 'connected', info });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// Minimal auth login implementation (POST /api/auth/login)
app.post('/api/auth/login', async (req, res) => {
  if (!process.env.MONGODB_URI) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  try {
    const c = await connect();
    const db = c.db();
    const users = db.collection('users');
    const user = await users.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    return res.status(200).json({ ok: true, userId: String(user._id), email: user.email });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Fallback for other API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not implemented in consolidated function. Add route to index.vercel.js' });
});

// Vercel serverless export: export default handler
export default async function handler(req, res) {
  // Express expects req.url starting at route root; Vercel passes original URL
  return app(req, res);
}
