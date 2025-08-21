import express from 'express';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat.js';
import { prisma } from './lib/prisma.js';

const app = express();

// trust proxy (Render/Cloudflare) to get real client IP
app.set('trust proxy', 1);

// -------- CORS (mirrors preflight, normalized origins) --------
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

app.use((req, res, next) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.path} ip=${req.ip}`);
  next();
});

app.use(express.json({ limit: '1mb' }));

// -------- Health --------
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// -------- DB health --------
app.get('/health/db', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`;
    res.json({ ok: true, db: rows });
  } catch (e) {
    console.error('[health/db] fail', e);
    res.status(500).json({ ok: false, error: 'DB unreachable' });
  }
});

// -------- Rate limit /api/chat --------
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health' || req.path === '/health/db',
  handler: (req, res) => {
    const reset = Number(res.getHeader('RateLimit-Reset')) || undefined;
    res
      .setHeader('X-Dijon-RateLimit', String(res.getHeader('RateLimit') || ''))
      .setHeader('X-Dijon-RateLimit-Remaining', String(res.getHeader('RateLimit-Remaining') || ''))
      .status(429)
      .json({ error: 'Too many requests', detail: 'Please wait a bit and try again.', retryAfterSeconds: reset });
  },
});

// Attach router (no LowDB anywhere)
app.use(
  '/api/chat',
  chatLimiter,
  (req, res, next) => {
    const remaining = res.getHeader('RateLimit-Remaining');
    if (remaining !== undefined) res.setHeader('X-Dijon-RateLimit-Remaining', String(remaining));
    next();
  },
  chatRouter
);

// -------- Start --------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[server] Listening on ${PORT}. Allowed origins: ${ALLOWED.length ? ALLOWED.join(', ') : '(none)'}`);
});
