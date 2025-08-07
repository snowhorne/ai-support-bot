const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.send('Dijon backend is live 🚀');
});

app.use('/api/chat', chatRoute);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
