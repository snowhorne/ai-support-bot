require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Apply CORS first
const allowedOrigins = [
  'http://localhost:3000',
  'https://ai-support-bot-mu.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
}));

app.use(express.json());

// ✅ Handle preflight OPTIONS request globally
app.options('*', cors());

// ✅ Optional request logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.send('Dijon backend is live 🚀');
});

// Chat route
app.use('/api/chat', chatRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
