const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory store for conversation history keyed by userId
const memoryStore = {};

router.post('/', async (req, res) => {
  const { message, userId } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  // Initialize memory if this is the user's first message
  if (!memoryStore[userId]) {
    memoryStore[userId] = [];
  }

  // Add user's message to their history
  memoryStore[userId].push({ role: 'user', content: message });

  // Trim to last 10 messages (5 exchanges)
  memoryStore[userId] = memoryStore[userId].slice(-10);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Dijon, a friendly, professional, and efficient AI customer support assistant for a modern e-commerce brand. Respond helpfully and concisely. Use a warm tone. If you don’t know something, say so instead of making it up.`
        },
        ...memoryStore[userId]
      ]
    });

    const reply = response.choices[0]?.message?.content?.trim() || "I'm not sure how to respond to that.";

    // Save assistant's reply
    memoryStore[userId].push({ role: 'assistant', content: reply });

    // Trim again if necessary
    memoryStore[userId] = memoryStore[userId].slice(-10);

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Something went wrong while processing your message.' });
  }
});

module.exports = router;
