// server/index.js
console.log('INDEX_FINGERPRINT v6 - /server/index.js (ESM)');

import express from 'express';
import chatRouter from './routes/chat.js';
import db from './db.js'; // used for /debug/db

const app = express();

/* ---------------------- CORS (hardened) ---------------------- *
 * - Reads allowed origins from CORS_ORIGINS env (comma-separated)
 * - Mirrors Access-Control-Request-Method / -Headers from the request
 * - Ensures headers are set BEFORE returning 204 for OPTIONS
 * ------------------------------------------------------------- */
const ALLOWED = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // allow all if ALLOWED empty (dev fallback), else only exact matches
  const isAllowed = !!origin && (ALLOWED.length === 0 || ALLOWED.includes(origin));

  // Optional debug (set CORS_DEBUG=1 on Render to print)
  if (process.env.CORS_DEBUG) {
    console.log('[CORS]', {
      method: req.method,
      path: req.path,
      origin,
      isAllowed,
      reqMethod: req.headers['access-control-request-method'],
      reqHeaders: req.headers['access-control-request-headers'],
    });
  }

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');

    // Mirror requested method/headers if present (some browsers want echo)
    const reqMethod = req.headers['access-control-request-method'];
    const reqHeaders = req.headers['access-control-request-headers'];

    res.setHeader('Access-Control-Allow-Methods', reqMethod || 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'content-type,authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight for 24h
  }

  if (req.method === 'OPTIONS') {
    // Always end preflight quickly.
    // If not allowed, no ACAO is set and the browser will block (expected).
    return res.status(204).end();
  }

  next();
});

/* ---------------------- Body parser ---------------------- */
app.use(express.json({ limit: '1mb' }));

/* ---------------------- Health ---------------------- */
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    allowedOrigins: ALLOWED,
  });
});

/* ---------------------- Debug DB (remove for prod) ---------------------- */
app.get('/debug/db', (_req, res) => {
  res.json(db.data);
});

/* ---------------------- API routes ---------------------- */
app.use('/api/chat', chatRouter);

/* ---------------------- Start server ---------------------- */
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
