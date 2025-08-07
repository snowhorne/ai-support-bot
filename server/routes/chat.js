const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory history object
let conversationHistory = [];

router.post('/', async (req, res) => {
  const { message } = req.body;

  try {
    // Add latest user message to the history
    conversationHistory.push({ role: 'user', content: message });

    // Keep only the last 10 messages (5 exchanges)
    const recentHistory = conversationHistory.slice(-10);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Dijon, a friendly, professional, and efficient AI customer support assistant for a modern e-commerce brand. Respond helpfully and concisely. Use a warm tone. If you don’t know something, say so instead of making it up.`
        },
        ...recentHistory
      ]
    });

    const reply = response.choices[0].message.content;

    // Add assistant's reply to the conversation history
    conversationHistory.push({ role: 'assistant', content: reply });

    res.json({ reply });

  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;