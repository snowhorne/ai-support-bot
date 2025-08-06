# AI Customer Support Bot (Starter)

## 📦 Setup Instructions

### Prerequisites
- Node.js (Install from https://nodejs.org)
- OpenAI API key

### 🚀 Installation

```bash
git clone <this-repo-url>
cd ai-support-bot
```

Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

Create a `.env` file inside `server/` with:

```
OPENAI_API_KEY=your-api-key-here
```

### 🏃 Run the App

In one terminal (backend):
```bash
cd server
node index.js
```

In another terminal (frontend):
```bash
cd client
npm start
```

Frontend is served at `http://localhost:3000`  
API runs at `http://localhost:5000/api/chat`
