const express = require('express');
const db = require('../db');
const { getAIResponse } = require('../openai');

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  try {
    await db.read();
    db.data ||= { conversations: [] };

    // ✅ SAFE: lookup in array, no indexing
    let convo = db.data.conversations.find(c => c.userId === userId);
    if (!convo) {
      convo = { userId, messages: [] };
      db.data.conversations.push(convo);
    }

    convo.messages.push({ role: 'user', content: message });

    const context = convo.messages.slice(-10);
    const aiReply = await getAIResponse(context);

    convo.messages.push({ role: 'assistant', content: aiReply });
    await db.write();

    console.log(`[REPLY] ${aiReply}`);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('[ERROR in /chat]:', error.message || error);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

module.exports = router;
