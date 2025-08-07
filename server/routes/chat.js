const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory conversation history
let conversationHistory = [];

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Add user message to history
  conversationHistory.push({ role: 'user', content: message });

  // Keep only last 10 messages (5 user + 5 bot)
  const recentHistory = conversationHistory.slice(-10);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Dijon, a friendly, professional, and efficient AI customer support assistant for a modern e-commerce brand. Respond helpfully and concisely. Use a warm tone. If you don't know something, say so instead of making it up.`
        },
        ...recentHistory
      ]
    });

    const reply = response.choices[0].message.content;

    // Add bot reply to history
    conversationHistory.push({ role: 'assistant', content: reply });

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to get response from AI.' });
  }
});

module.exports = router;
