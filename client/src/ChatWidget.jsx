// client/src/ChatWidget.jsx
import React, { useEffect, useRef, useState } from 'react';
import { sendToDijon } from './lib/dijon';

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I’m Dijon. How can I help today?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(null); // epoch ms
  const [placeholder, setPlaceholder] = useState('Type your message…');

  const userIdRef = useRef(null);
  if (!userIdRef.current) {
    userIdRef.current = localStorage.getItem('dijon_user_id') || makeId();
    localStorage.setItem('dijon_user_id', userIdRef.current);
  }
  const userId = userIdRef.current;

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    // optimistic add
    setMessages((m) => [...m, { role: 'user', content: trimmed }]);
    setInput('');
    setIsTyping(true);

    const res = await sendToDijon({ userId, message: trimmed });
    setIsTyping(false);

    if (res.ok) {
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
      // Optionally reflect remaining tokens in placeholder
      if (typeof res.meta?.remaining === 'number') {
        setPlaceholder(
          `Type your message… (${res.meta.remaining} left / 5 min)`
        );
      }
      return;
    }

    // Friendly error UX
    setMessages((m) => [
      ...m,
      {
        role: 'assistant',
        content: res.error || 'Something went wrong. Please try again.',
      },
    ]);

    // If 429 with reset, enforce a local cooldown
    if (res.meta?.status === 429) {
      const resetSec = Number(res.meta.resetSeconds || 15); // fallback
      const until = Date.now() + resetSec * 1000;
      setCooldownUntil(until);
      tickCooldown(until);
    }
  };

  // simple cooldown ticker to update placeholder each second
  const tickCooldown = (until) => {
    const tick = () => {
      const now = Date.now();
      if (now >= until) {
        setCooldownUntil(null);
        setPlaceholder('Type your message…');
        return;
      }
      const secs = Math.max(1, Math.ceil((until - now) / 1000));
      setPlaceholder(`Cooling down… try again in ${secs}s`);
      setTimeout(tick, 1000);
    };
    tick();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const disabled = !!(cooldownUntil && Date.now() < cooldownUntil);
  const showTyping = isTyping && !disabled;

  return (
    <div className="w-full max-w-md mx-auto border rounded-2xl shadow p-4 bg-white">
      <div className="h-80 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.map((m, idx) => (
          <Bubble key={idx} role={m.role} text={m.content} />
        ))}
        {showTyping && <TypingDots />}
      </div>

      <div className="flex gap-2">
        <textarea
          rows={2}
          className="flex-1 border rounded-xl p-2 focus:outline-none"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        <button
          className={`px-4 py-2 rounded-xl text-white ${
            disabled ? 'bg-gray-400' : 'bg-black'
          }`}
          onClick={onSend}
          disabled={disabled}
          aria-disabled={disabled}
          title={disabled ? 'Please wait a moment' : 'Send'}
        >
          Send
        </button>
      </div>

      {disabled && (
        <p className="text-xs text-gray-500 mt-2">
          You’ve hit the limit. A short cooldown helps keep things smooth for everyone.
        </p>
      )}
    </div>
  );
}

function Bubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  // simple CSS dots
  return (
    <div className="flex gap-1 items-center text-gray-500">
      <span className="sr-only">Dijon is typing</span>
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </div>
  );
}

function Dot({ delay }) {
  const style = {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#9CA3AF',
    animation: `dijon-bounce 1s infinite`,
    animationDelay: delay,
  };
  return <span style={style} />;
}

// Tiny helper to generate a local user id
function makeId() {
  return 'u_' + Math.random().toString(36).slice(2, 10);
}

// Inject a tiny keyframes stylesheet for dots
const styleTagId = 'dijon-typing-style';
if (typeof document !== 'undefined' && !document.getElementById(styleTagId)) {
  const style = document.createElement('style');
  style.id = styleTagId;
  style.textContent = `
@keyframes dijon-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1.0); opacity: 1; }
}`;
  document.head.appendChild(style);
}
