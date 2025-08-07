// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 10000;

// Explicit CORS configuration
const corsOptions = {
  origin: 'https://ai-support-bot-mu.vercel.app', // Allow your Vercel frontend
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
};

app.use(cors(corsOptions));
app.use(express.json());

// Optional: Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Dijon backend is live 🚀');
});

// Chat route
app.use('/api/chat', chatRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
