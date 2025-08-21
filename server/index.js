// server/index.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat.js';

const app = express();

// IMPORTANT: behind a proxy (Render/Cloudflare) so we see the real client IP
app.set('trust proxy', 1);

// -------- CORS (keeps your hardened behavior) --------
const normalizeOrigin = (o) => (o ? o.replace(/\/+$/, '').toLowerCase() : '');
const ALLOWED = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

function setCors(req, res) {
  const reqOrigin = normalizeOrigin(req.headers.origin || '');
  if (ALLOWED.includes(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  const acrm = req.headers['access-control-request-method'];
  const acrh = req.headers['access-control-request-headers'];
  if (acrm) res.setHeader('Access-Control-Allow-Methods', acrm);
  if (acrh) res.setHeader('Access-Control-Allow-Headers', acrh);
  res.setHeader('Access-Control-Max-Age', '600');
}

// CORS + preflight short‑circuit (headers set BEFORE 204)
app.use((req, res, next) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Basic request log (concise)
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.path} ip=${req.ip}`);
  next();
});

app.use(express.json({ limit: '1mb' }));

// -------- Health --------
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// -------- Rate limiting for /api/chat --------
// 30 requests / 5 minutes per IP; skip HEALTH & OPTIONS
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  keyGenerator: (req /*, res */) => req.ip, // trust proxy enabled above
  skip: (req /*, res */) =>
    req.method === 'OPTIONS' || req.path === '/health',
  handler: (req, res /*, next, options */) => {
    // Friendly JSON for the frontend
    const reset =
      (res.getHeader('RateLimit-Reset') && Number(res.getHeader('RateLimit-Reset'))) ||
      undefined;
    res.status(429).json({
      error: 'Too many requests',
      detail: 'Please wait a bit and try again.',
      retryAfterSeconds: reset,
    });
  },
});

app.use('/api/chat', chatLimiter, chatRouter);

// -------- Start server --------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(
    `[server] Listening on ${PORT}. Allowed origins: ${
      ALLOWED.length ? ALLOWED.join(', ') : '(none)'
    }`
  );
});
