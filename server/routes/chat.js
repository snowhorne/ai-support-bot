// server/routes/chat.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body || {};
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    if (!db.data.conversations[userId]) db.data.conversations[userId] = [];

    db.data.conversations[userId].push({ role: 'user', content: message, at: Date.now() });
    await db.write();

    let reply = `Dijon here 👋 — you said: "${message}"`;

    if (process.env.OPENAI_API_KEY) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are Dijon, a friendly AI support bot for a website.' },
            ...db.data.conversations[userId].slice(-10),
          ],
          temperature: 0.4,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error('OpenAI error:', data);
        throw new Error(data?.error?.message || 'OpenAI request failed');
      }
      reply = (data?.choices?.[0]?.message?.content || '').trim() || reply;
    }

    db.data.conversations[userId].push({ role: 'assistant', content: reply, at: Date.now() });
    await db.write();

    res.json({ reply });
  } catch (err) {
    console.error('POST /api/chat failed:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router; // <= important
