const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory history object
let conversationHistory = [];

router.post('/', async (req, res) => {
  const { message } = req.body;

  try {
    // Add latest user message
    conversationHistory.push({ role: 'user', content: message });

    // Limit to last 5 interactions (user + assistant = 10 messages)
    const recentHistory = conversationHistory.slice(-10);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            "You are Dijon, a friendly, professional, and efficient AI customer support assistant for a modern e-commerce brand. Respond helpfully and concisely. Use a warm tone. If you don't know
