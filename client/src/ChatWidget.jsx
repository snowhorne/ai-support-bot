import { sendToDijon } from '../lib/dijon';
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ChatWidget.css';
import avatar from './assets/bot-avatar.png';

// Helper to get or create a persistent user ID
const getUserId = () => {
  let id = localStorage.getItem('dijon_user_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('dijon_user_id', id);
  }
  return id;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi, I’m Dijon! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const userId = getUserId(); // Ensure persistent user ID

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await sendToDijon(userId, input);

      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: reply || 'No reply received.' }
      ]);
    } catch (error) {
      console.error('[Frontend Error]', error);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: error.message || 'Oops, something went wrong.' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') sendMessage();
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <>
      <button className="chat-bubble" onClick={toggleChat}>
        💬
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-left">
              <img src={avatar} alt="Avatar" className="chat-avatar" />
              <span className="chat-title">Dijon</span>
            </div>
            <button className="close-button" onClick={toggleChat}>×</button>
          </div>

          <div className="chat-body">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <span className="dot">💬</span>
                <span className="dot">💬</span>
                <span className="dot">💬</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="chat-input"
              placeholder="Type your message..."
            />
            <button onClick={sendMessage} className="send-button">Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
