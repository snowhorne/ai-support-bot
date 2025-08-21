import React, { useEffect, useMemo, useRef, useState } from "react";
import { sendToDijon } from "./lib/dijon";

// Self-contained, namespaced CSS (no external stylesheet needed)
const STYLES = `
.dijon-widget { position: fixed; right: 16px; bottom: 16px; z-index: 9999; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
.dijon-button { width: 56px; height: 56px; border-radius: 50%; background:#1476ff; color:#fff; border:none; box-shadow: 0 8px 24px rgba(20,118,255,0.3); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.dijon-button:hover { filter: brightness(1.05); }
.dijon-button:active { transform: translateY(1px); }

.dijon-panel { position: absolute; right: 0; bottom: 72px; width: 340px; max-height: 70vh; display:flex; flex-direction:column; border-radius: 16px; background: #fff; box-shadow: 0 18px 40px rgba(20,118,255,0.25), 0 2px 10px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #eaf1ff; }
.dijon-header { background:#1476ff; color:#fff; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; }
.dijon-title { font-weight:700; font-size:14px; display:flex; align-items:center; gap:10px; }
.dijon-avatar { width:24px; height:24px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; color:#1476ff; font-weight:800; }

.dijon-close { background:transparent; border:none; color:#fff; font-size:18px; line-height:1; cursor:pointer; opacity:0.9; }
.dijon-close:hover { opacity:1; }

.dijon-body { padding:12px; overflow:auto; display:flex; flex-direction:column; gap:10px; background:#f7faff; }
.dijon-msg { max-width: 80%; padding:10px 12px; border-radius: 14px; font-size: 14px; line-height: 1.35; }
.dijon-msg.assistant { align-self:flex-start; background:#1476ff; color:#fff; border-bottom-left-radius: 6px; }
.dijon-msg.user { align-self:flex-end; background:#e9eefc; color:#1b1f29; border-bottom-right-radius: 6px; }

.dijon-typing { align-self:flex-start; display:flex; gap:6px; padding:8px 10px; background:#d6e5ff; color:#1b1f29; border-radius:12px; font-size:12px; }
.dijon-typing .dot { width:6px; height:6px; border-radius:50%; background:#1476ff; opacity:.7; animation: dijon-blink 1.2s infinite ease-in-out; }
.dijon-typing .dot:nth-child(2){ animation-delay: .2s; }
.dijon-typing .dot:nth-child(3){ animation-delay: .4s; }
@keyframes dijon-blink { 0%, 80%, 100% { transform: translateY(0); opacity:.3; } 40% { transform: translateY(-2px); opacity:1; } }

.dijon-footer { border-top:1px solid #e6edff; background:#fff; padding:10px; display:flex; gap:8px; }
.dijon-input { flex:1; padding:10px 12px; border-radius: 10px; border:1px solid #cfe0ff; outline:none; font-size:14px; }
.dijon-input::placeholder { color:#98a6c3; }
.dijon-send { background:#1476ff; color:#fff; border:none; border-radius:10px; padding:10px 14px; font-weight:600; cursor:pointer; }
.dijon-send:disabled { opacity:0.6; cursor:not-allowed; }
`;

// Very small helper: stable per-browser userId
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
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I’m Dijon! How can I help you today?" },
  ]);
  const userId = useMemo(getOrCreateUserId, []);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);

    try {
      const { reply, error, detail } = await sendToDijon(userId, text);
      if (error) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: detail || "Hmm, I hit a snag. Please try again." },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: reply || "…" }]);
      }
    } catch (e) {
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
      {/* Inject styles once */}
      <style>{STYLES}</style>

      {!open && (
        <button
          className="dijon-button"
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          title="Chat with Dijon"
        >
          💬
        </button>
      )}

      {open && (
        <div className="dijon-panel" role="dialog" aria-label="Dijon chat">
          <div className="dijon-header">
            <div className="dijon-title">
              <span className="dijon-avatar">D</span> Dijon
            </div>
            <button
              className="dijon-close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="dijon-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`dijon-msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="dijon-typing" aria-live="polite">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
          </div>

          <div className="dijon-footer">
            <input
              className="dijon-input"
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            <button className="dijon-send" onClick={send} disabled={busy || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
