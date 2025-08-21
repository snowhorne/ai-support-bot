import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('[warn] OPENAI_API_KEY is not set. /api/chat will fail.');
}

// Short, friendly, one clarifying question if needed
const DIJON_SYSTEM_PROMPT = `You are Dijon, a friendly, concise website support assistant.
- Answer clearly in 1–4 short sentences.
- If the request is unclear or missing one key detail, ask exactly ONE clarifying question first.
- Be upbeat and practical. Avoid fluff.
- If you can’t help, say so briefly and suggest the simplest next step.`;

// ---- DB helpers ----
async function getOrCreateUser(extUserId) {
  let u = await prisma.user.findUnique({ where: { extUserId } });
  if (u) return u;
  return prisma.user.create({ data: { extUserId } });
}

async function getOrCreateConversation(extUserId) {
  const user = await getOrCreateUser(extUserId);
  // one active conversation per extUserId for now
  let convo = await prisma.conversation.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (convo) return convo;
  return prisma.conversation.create({ data: { userId: user.id, title: null } });
}

async function loadRecentMessages(conversationId, limit = 20) {
  const msgs = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });
  return msgs.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

function buildMessages(history, userMsg) {
  return [
    { role: 'system', content: DIJON_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMsg },
  ];
}

router.post('/', async (req, res) => {
  const t0 = Date.now();
  try {
    const { userId, message } = req.body || {};
    if (!userId || !message) return res.status(400).json({ error: 'Missing userId or message' });
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Server not configured',
        detail: 'OPENAI_API_KEY is missing. Please set it on the server and try again.',
      });
    }

    const convo = await getOrCreateConversation(userId);

    // Save user message
    await prisma.message.create({
      data: { conversationId: convo.id, role: 'user', content: message },
    });

    const history = await loadRecentMessages(convo.id, 20);

    // OpenAI call with 20s timeout
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
          messages: buildMessages(history, message),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await safeJson(resp);
        console.error('[openai:error]', resp.status, errBody);
        return res.status(502).json({
          error: 'Upstream AI error',
          detail: 'I hit a snag reaching the AI service. Please try again in a moment.',
        });
      }

      const data = await resp.json();
      aiText = data?.choices?.[0]?.message?.content?.trim() || "Sorry—I couldn't generate a reply.";
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('[chat] OpenAI request timed out (20s).');
        return res.status(504).json({
          error: 'Timeout',
          detail: "I'm a bit slow right now and took too long to respond. Please try again.",
        });
      }
      console.error('[chat] OpenAI fetch failed:', e);
      return res.status(502).json({
        error: 'AI fetch failed',
        detail: 'Something went wrong contacting the AI service. Please try again.',
      });
    } finally {
      clearTimeout(timeout);
    }

    // Save assistant reply
    await prisma.message.create({
      data: { conversationId: convo.id, role: 'assistant', content: aiText },
    });

    const ms = Date.now() - t0;
    console.log(`[chat] (pg) userId=${userId} convo=${convo.id} replied in ${ms}ms len=${aiText.length}`);

    res.json({ reply: aiText });
  } catch (err) {
    console.error('[chat] Unhandled error:', err);
    res.status(500).json({ error: 'Server error', detail: 'Unexpected error. Please try again.' });
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
