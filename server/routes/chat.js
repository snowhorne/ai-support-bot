// server/routes/chat.js
import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('[warn] OPENAI_API_KEY is not set. /api/chat will fail.');
}

// Short, friendly, one-clarifying-question-if-needed
const DIJON_SYSTEM_PROMPT = `You are Dijon, a friendly, concise website support assistant.
- Answer clearly in 1–4 short sentences.
- If the request is unclear or missing one key detail, ask exactly ONE clarifying question first.
- Be upbeat and practical. Avoid fluff.
- If you can’t help, say so briefly and suggest the simplest next step.`;

function buildMessages(history, userMsg) {
  // Keep the last ~10 exchanges to stay lightweight
  const recent = history.slice(-20);
  return [
    { role: 'system', content: DIJON_SYSTEM_PROMPT },
    ...recent,
    { role: 'user', content: userMsg },
  ];
}

router.post('/', async (req, res) => {
  const t0 = Date.now();
  try {
    const { userId, message } = req.body || {};
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Server not configured',
        detail:
          'OPENAI_API_KEY is missing. Please set it on the server and try again.',
      });
    }

    // Initialize conversation if needed
    const convo = db.data.conversations[userId] || [];
    // Append user message
    convo.push({ role: 'user', content: message, at: new Date().toISOString() });

    // Call OpenAI with 20s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    let aiText = '';
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          messages: buildMessages(convo, message),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await safeJson(resp);
        console.error('[openai:error]', resp.status, errBody);
        // Bad upstream = 502 to client
        return res.status(502).json({
          error: 'Upstream AI error',
          detail:
            'I hit a snag reaching the AI service. Please try again in a moment.',
        });
      }

      const data = await resp.json();
      aiText =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Sorry—I couldn't generate a reply.";
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('[chat] OpenAI request timed out (20s).');
        return res.status(504).json({
          error: 'Timeout',
          detail:
            "I'm a bit slow right now and took too long to respond. Please try again.",
        });
      }
      console.error('[chat] OpenAI fetch failed:', e);
      return res.status(502).json({
        error: 'AI fetch failed',
        detail:
          'Something went wrong contacting the AI service. Please try again.',
      });
    } finally {
      clearTimeout(timeout);
    }

    // Append assistant reply
    convo.push({
      role: 'assistant',
      content: aiText,
      at: new Date().toISOString(),
    });

    // Persist conversation (object keyed by userId)
    db.data.conversations[userId] = convo;
    await db.write();

    const ms = Date.now() - t0;
    console.log(
      `[chat] userId=${userId} replied in ${ms}ms, tokens≈n/a, len=${aiText.length}`
    );

    return res.json({ reply: aiText });
  } catch (err) {
    console.error('[chat] Unhandled error:', err);
    return res.status(500).json({
      error: 'Server error',
      detail: 'Unexpected error. Please try again.',
    });
  }
});

async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return { raw: await resp.text().catch(() => '') };
  }
}

export default router;
