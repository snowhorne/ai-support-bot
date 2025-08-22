import React, { useEffect, useMemo, useRef, useState } from "react";
import { sendToDijon } from "./lib/dijon";
import avatar from "./assets/dijon-avatar.png";

const STYLES = `/* ... keep same styles ... */`;

const getOrCreateUserId = () => {
  const KEY = "dijon_user_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I’m Dijon! How can I help you today?" },
  ]);
  const userId = useMemo(getOrCreateUserId, []);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // 🔑 Focus input again after every new message
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    inputRef.current?.focus(); // keep focus immediately
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const { reply, error, detail } = await sendToDijon({ userId, message: text });
      if (error) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: detail || error || "Hmm, I hit a snag. Please try again." },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: reply || "…" }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="dijon-widget">
      <style>{STYLES}</style>

      {!open && (
        <button
          className="dijon-button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          title="Chat with Dijon"
        >
          💬
        </button>
      )}

      {open && (
        <div className="dijon-panel" role="dialog" aria-label="Dijon chat">
          <div className="dijon-header">
            <div className="dijon-title">
              <span className="dijon-avatar"><img src={avatar} alt="Dijon" /></span>
              Dijon
            </div>
            <button className="dijon-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="dijon-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`dijon-msg ${m.role}`}>{m.content}</div>
            ))}
            {busy && (
              <div className="dijon-typing"><span className="dot" /><span className="dot" /><span className="dot" /></div>
            )}
          </div>

          <div className="dijon-footer">
            <input
              ref={inputRef}
              className="dijon-input"
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            <button className="dijon-send" onClick={send} disabled={busy || !input.trim()}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
