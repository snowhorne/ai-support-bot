// ...top of file unchanged...
router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body || {};
    if (!userId || !message) return res.status(400).json({ error: 'userId and message are required' });

    if (!db.data.conversations[userId]) db.data.conversations[userId] = [];

    db.data.conversations[userId].push({ role: 'user', content: message, at: Date.now() });
    await db.write();

    let reply = `Dijon here 👋 — you said: "${message}"`; // fallback if no OPENAI_API_KEY

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
            {
              role: 'system',
              content: [
                "You are **Dijon**, a concise, friendly AI support bot for our website.",
                "Tone: warm, helpful, human. Keep answers under ~4 sentences when possible.",
                "Always acknowledge the user's message in your first sentence.",
                "If the user asks something vague, ask exactly ONE smart clarifying question.",
                "If you’re unsure, say so briefly and suggest the next step.",
              ].join(' ')
            },
            // send a short recent history to keep context lightweight
            ...db.data.conversations[userId].slice(-10).map(m => ({ role: m.role, content: m.content })),
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

    return res.json({ reply });
  } catch (err) {
    console.error('POST /api/chat failed:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});
