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
    console.log('Incoming request:', { userId, message });
    await db.read();
    console.log('Database after read:', db.data);

    // Ensure default structure
    db.data ||= { conversations: {} };

    // Initialize user if not present
    if (!db.data.conversations[userId]) {
      db.data.conversations[userId] = { messages: [] };
    }

    // Store user's message
    db.data.conversations[userId].messages.push({ role: 'user', content: message });

    // Get last 10 messages as context
    const context = db.data.conversations[userId].messages.slice(-10);

    // Get AI reply
    const aiReply = await getAIResponse(context);

    // Store assistant's reply
    db.data.conversations[userId].messages.push({ role: 'assistant', content: aiReply });

    // Persist conversation
    await db.write();

    console.log(`[REPLY] ${aiReply}`);
    res.json({ reply: aiReply });
  } catch (error) {
    console.error('[ERROR in /chat]:', error.message || error);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

export default router;
