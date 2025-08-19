import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function getAIResponse(context) {
  const messages = [
    { role: 'system', content: 'You are Dijon, a friendly support chatbot.' },
    ...context
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    temperature: 0.7
  });

  return response.choices[0]?.message?.content?.trim() || 'Sorry, I had trouble responding.';
}
