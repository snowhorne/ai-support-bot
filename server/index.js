// server/index.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat.js';
import { prisma } from './lib/prisma.js';

const app = express();

// Render/Cloudflare proxy → trust first proxy to get real client IP
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

// Concise request log
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.path} ip=${req.ip}`);
  next();
});

app.use(express.json({ limit: '1mb' }));

// -------- Basic health --------
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// -------- DB health (Prisma SELECT 1) --------
app.get('/health/db', async (req, res) => {
  try {
    // Lightweight connectivity check
    const rows = await prisma.$queryRaw`SELECT 1 as ok`;
    return res.json({ ok: true, db: rows });
  } catch (err) {
    console.error('[health/db] DB check failed:', err);
    return res.status(500).json({ ok: false, error: 'DB unreachable' });
  }
});

// -------- Rate limiting for /api/chat --------
// 30 requests / 5 minutes per IP; skip OPTIONS & /health*
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) =>
    req.method === 'OPTIONS' ||
    req.path === '/health' ||
    req.path === '/health/db',
  handler: (req, res) => {
    const reset = Number(res.getHeader('RateLimit-Reset')) || undefined;
    res
      .setHeader('X-Dijon-RateLimit', String(res.getHeader('RateLimit') || ''))
      .setHeader(
        'X-Dijon-RateLimit-Remaining',
        String(res.getHeader('RateLimit-Remaining') || '')
      )
      .status(429)
      .json({
        error: 'Too many requests',
        detail: 'Please wait a bit and try again.',
        retryAfterSeconds: reset,
      });
  },
});

app.use(
  '/api/chat',
  chatLimiter,
  (req, res, next) => {
    const remaining = res.getHeader('RateLimit-Remaining');
    if (remaining !== undefined) {
      res.setHeader('X-Dijon-RateLimit-Remaining', String(remaining));
    }
    next();
  },
  chatRouter
);

// -------- Admin metrics (protected by ADMIN_TOKEN) --------
app.get('/admin/metrics', async (req, res) => {
  try {
    const token = req.header('x-admin-token') || '';
    const expected = process.env.ADMIN_TOKEN || '';
    if (!expected || token !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [users, convos, msgs, lastMsg] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.message.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return res.json({
      users,
      conversations: convos,
      messages: msgs,
      lastActivity: lastMsg?.createdAt || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[admin/metrics] failed:', err);
    return res.status(500).json({ error: 'Metrics error' });
  }
});

// -------- Start server --------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(
    `[server] Listening on ${PORT}. Allowed origins: ${
      ALLOWED.length ? ALLOWED.join(', ') : '(none)'
    }`
  );
});
