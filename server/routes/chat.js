const express = require('express');
const db = require('../db');
const { getAIResponse } = require('../openai');

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  await db.read();
  db.data ||= { conversations: [] };

  // ✅ Correct array-based lookup
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

  res.json({ reply: aiReply });
});

module.exports = router;
