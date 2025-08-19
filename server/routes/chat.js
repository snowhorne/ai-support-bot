import express from 'express';
import db from '../db.js';
import { getAIResponse } from '../utils/openai.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  try {
    await db.read();
    db.data ||= { conversations: {} };

    if (!db.data.conversations[userId]) {
      db.data.conversations[userId] = [];
    }

    db.data.conversations[userId].push({ role: 'user', content: message });

    const context = db.data.conversations[userId].slice(-10);
    const aiReply = await getAIResponse(context);

    db.data.conversations[userId].push({ role: 'assistant', content: aiReply });

    await db.write();

    console.log(`[REPLY] ${aiReply}`);
    res.json({ reply: aiReply });
  } catch (error) {
    console.error('[ERROR in /chat]:', error.message || error);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

export default router;
