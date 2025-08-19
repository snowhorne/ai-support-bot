// server/index.js
console.log('INDEX_FINGERPRINT v5 - /server/index.js (ESM)');

import express from 'express';
import chatRouter from './routes/chat.js';
import db from './db.js'; // used for /debug/db

const app = express();

// --- CORS (preflight + allowed origins from env) ---
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Manual CORS so we fully control preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowThisOrigin =
    allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin));

  if (allowThisOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // important for preflight
  }

  return next();
});

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    allowedOrigins,
  });
});

// 🔍 TEMP DEBUG: view LowDB contents (remove before production)
app.get('/debug/db', (_req, res) => {
  res.json(db.data);
});

// API routes
app.use('/api/chat', chatRouter);

// Start server
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
