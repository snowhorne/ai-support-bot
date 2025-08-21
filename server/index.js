// server/index.js
console.log('INDEX_FINGERPRINT v7 - /server/index.js (ESM, normalized CORS)');

import express from 'express';
import chatRouter from './routes/chat.js';
import db from './db.js'; // used for /debug/db

const app = express();

/* ---------------------- CORS (hardened + normalized) ---------------------- *
 * - Reads allowed origins from CORS_ORIGINS env (comma-separated)
 * - Normalizes (lowercase + strip trailing slashes) before comparison
 * - Mirrors Access-Control-Request-Method / -Headers from the request
 * - Ensures headers are set BEFORE returning 204 for OPTIONS
 * -------------------------------------------------------------------------- */
const normalize = (s) => (s || '').trim().replace(/\/+$/, '').toLowerCase();

const ALLOWED = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(normalize)
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const normOrigin = normalize(origin);
  const isAllowed = !!origin && (ALLOWED.length === 0 || ALLOWED.includes(normOrigin));

  // Optional debug: set CORS_DEBUG=1 in env to log
  if (process.env.CORS_DEBUG) {
    console.log('[CORS]', {
      method: req.method,
      path: req.path,
      origin,
      normOrigin,
      isAllowed,
      ALLOWED,
      reqMethod: req.headers['access-control-request-method'],
      reqHeaders: req.headers['access-control-request-headers'],
    });
  }

  if (isAllowed) {
    // Echo the raw Origin (not normalized) so the browser accepts it
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');

    // Mirror requested method/headers if provided
    const reqMethod = req.headers['access-control-request-method'];
    const reqHeaders = req.headers['access-control-request-headers'];

    res.setHeader('Access-Control-Allow-Methods', reqMethod || 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'content-type,authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight for 24h
  }

  if (req.method === 'OPTIONS') {
    // Always end preflight quickly
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
    allowedOrigins: ALLOWED, // normalized list (no trailing slashes)
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
