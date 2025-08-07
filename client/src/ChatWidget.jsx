import React, { useState } from 'react';
import './ChatWidget.css';

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: 'Hi there! I’m Dijon. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('https://ai-support-bot.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await response.json();
      setMessages([...newMessages, { sender: 'assistant', text: data.message }]);
    } catch (err) {
      setMessages([...newMessages, { sender: 'assistant', text: 'Sorry, something went wrong.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-widget">
      {!isOpen ? (
        <button className="chat-icon" onClick={handleToggle}>💬</button>
      ) : (
        <div className="chat-popup">
          <div className="chat-header">
            <img src="/bot-avatar.png" alt="Avatar" className="chat-avatar" />
            Dijon
            <button className="chat-close" onClick={handleToggle}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="chat-message assistant">
                <em>Dijon is typing...</em>
              </div>
            )}
          </div>
          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;