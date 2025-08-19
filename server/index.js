require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Allowed origins for local dev + Vercel frontend
const allowedOrigins = [
  'http://localhost:3000',
  'https://ai-support-bot-mu.vercel.app'
];

// ✅ CORS config (safe fallback on disallowed origins)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(null, false); // Don't crash, just deny
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight support
app.use(express.json());

// ✅ Request logging for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('Dijon backend is live 🚀');
});

// ✅ Main chat route
app.use('/api/chat', chatRoute);

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
