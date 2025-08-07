require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Explicit CORS config for Render + Vercel
const allowedOrigins = [
  'http://localhost:3000',
  'https://ai-support-bot-mu.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // <-- preflight support
app.use(express.json());

// Log requests for debug
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.send('Dijon backend is live 🚀');
});

app.use('/api/chat', chatRoute);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
