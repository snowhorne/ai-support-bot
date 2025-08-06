const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
{
  role: 'system',
  content:
    'You are a friendly, professional, and efficient AI customer support assistant for a modern e-commerce brand. Respond helpfully and concisely. Use a warm tone. If you do not know the answer, offer to escalate the issue to a human support agent.'
},
        { role: 'user', content: message }
      ]
    });
    console.log("OpenAI response:", response.choices[0].message.content);
    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating response');
  }
});

module.exports = router;
