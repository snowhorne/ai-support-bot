// server/routes/chat.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// --- Config ---
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = 20000; // 20s server-side timeout

const DIJON_SYSTEM_PROMPT = `
You are “Dijon,” a friendly, concise website support assistant.
Keep answers brief (2–5 sentences) and in plain language.
If the request is unclear or missing one key detail, ask exactly ONE short clarifying question first.
Avoid fluff and repetition. If unsure, say so and suggest the next step.
`.trim();

// Simple timeout helper for any async operation
async function withTimeout(promiseFn, ms = 20000) {
  let tid;
  try {
    return await Promise.race([
      promiseFn(),
      new Promise((_, reject) => {
        tid = setTimeout(() => reject(new Error('Upstream timeout')), ms);
      }),
    ]);
  } finally {
    if (tid) clearTimeout(tid);
  }
}

router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body || {};
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    // Ensure user convo array exists
    if (!db.data.conversations[userId]) db.data.conversations[userId] = [];

    // Save user message
    db.data.conversations[userId].push({ role: 'user', content: message, at: Date.now() });
    await db.write();

    // Default fallback reply (used if no API key, or as last resort)
    let reply = `Dijon here 👋 — you said: "${message}"`;

    if (process.env.OPENAI_API_KEY) {
      // Build messages: system + last 10 turns (role/content only)
      const history = db.data.conversations[userId]
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      const messages = [
        { role: 'system', content: DIJON_SYSTEM_PROMPT },
        ...history,
      ];

      // Call OpenAI with timeout
      const data = await withTimeout(async () => {
        const resp = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages,
            temperature: 0.4,
            // Keep responses tight; adjust if you need longer answers
            max_tokens: 400,
          }),
        });

        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          console.error('[OpenAI error]', { status: resp.status, json });
          const msg = json?.error?.message || `OpenAI request failed (${resp.status})`;
          throw new Error(msg);
        }
        return json;
      }, OPENAI_TIMEOUT_MS);

      const candidate = data?.choices?.[0]?.message?.content;
      if (typeof candidate === 'string' && candidate.trim()) {
        reply = candidate.trim();
      }
    }

    // Save assistant reply
    db.data.conversations[userId].push({ role: 'assistant', content: reply, at: Date.now() });
    await db.write();

    return res.json({ reply });
  } catch (err) {
    const isTimeout = err?.message === 'Upstream timeout';
    if (isTimeout) {
      console.error('POST /api/chat timed out after %dms', OPENAI_TIMEOUT_MS);
      return res.status(504).json({ error: 'Upstream timeout' });
    }

    console.error('POST /api/chat failed:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message || 'unknown error' });
  }
});

export default router;
