import React, { useState } from 'react';
import './ChatWidget.css';

function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      const botMessage = { role: 'bot', content: data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Sorry, something went wrong.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="chat-container">
      {messages.map((msg, i) => (
        <div key={i} className={`chat-message ${msg.role}`}>
          {msg.role === 'bot' && (
            <img src="/bot-avatar.png" alt="bot" className="avatar" />
          )}
          <div className="chat-bubble">{msg.content}</div>
        </div>
      ))}
      {loading && (
        <div className="chat-message bot">
          <img src="/bot-avatar.png" alt="bot" className="avatar" />
          <div className="chat-bubble typing-indicator">Typing…</div>
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
      />
    </div>
  );
}

export default ChatWidget;
