const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

// Setup OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Setup LowDB
const dbFile = path.join(__dirname, '../db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { conversations: {} });

// Initialize LowDB once, then use it in requests
let isDbInitialized = false;
const initDb = async () => {
  if (!isDbInitialized) {
    await db.read();
    db.data ||= { conversations: {} };
    isDbInitialized = true;
  }
};

router.post('/', async (req, res) => {
  const { message, userId } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  await initDb();

  if (!db.data.conversations[userId]) {
    db.data.conversations[userId] = [];
  }

  db.data.conversations[userId].push({ role: 'user', content: message });
  db.data.conversations[userId] = db.data.conversations[userId].slice(-10);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Dijon, a friendly, professional, and efficient AI customer support assistant for a modern e-commerce brand. Respond helpfully and concisely. Use a warm tone. If you don’t know something, say so instead of making it up.`
        },
        ...db.data.conversations[userId]
      ]
    });

    const reply = response.choices[0]?.message?.content?.trim() || "I'm not sure how to respond to that.";
    db.data.conversations[userId].push({ role: 'assistant', content: reply });
    db.data.conversations[userId] = db.data.conversations[userId].slice(-10);
    await db.write();

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Something went wrong while processing your message.' });
  }
});

module.exports = router;
