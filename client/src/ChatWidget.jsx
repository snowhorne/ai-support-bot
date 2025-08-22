import React, { useEffect, useMemo, useRef, useState } from "react";
import { sendToDijon } from "./lib/dijon";
import avatar from "./assets/dijon-avatar.png"; // already added

const STYLES = `
.dijon-widget { position: fixed; right: 20px; bottom: 20px; z-index: 9999; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

/* Floating launcher button */
.dijon-button { width: 60px; height: 60px; border-radius: 50%; background:#1476ff; color:#fff; border:none; box-shadow: 0 10px 28px rgba(20,118,255,0.34); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size: 26px; }
.dijon-button:hover { filter: brightness(1.05); }

/* Chat panel sizing (desktop defaults) */
.dijon-panel { position: absolute; right: 0; bottom: 84px;
  width: 460px; max-width: 92vw;
  max-height: 82vh; min-height: 420px;
  display:flex; flex-direction:column; border-radius: 20px; background: #fff;
  box-shadow: 0 22px 56px rgba(20,118,255,0.25), 0 5px 18px rgba(0,0,0,0.10);
  overflow: hidden; border: 1px solid #eaf1ff;
}

/* Mobile-friendly override */
@media (max-width: 480px) {
  .dijon-widget { right: 12px; bottom: 12px; }
  .dijon-panel { width: 92vw; max-height: 75vh; min-height: 60vh; }
}

/* Header */
.dijon-header { background:#1476ff; color:#fff; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; }
.dijon-title { font-weight:700; font-size:16px; display:flex; align-items:center; gap:12px; }
.dijon-avatar { width:28px; height:28px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#fff; }
.dijon-avatar img { width:100%; height:100%; object-fit:cover; }
.dijon-close { background:transparent; border:none; color:#fff; font-size:22px; line-height:1; cursor:pointer; opacity:0.9; }
.dijon-close:hover { opacity:1; }

/* Body (messages area) */
.dijon-body { padding:16px; overflow:auto; display:flex; flex-direction:column; gap:12px; background:#f7faff; flex:1; }
.dijon-msg { max-width: 80%; padding:12px 14px; border-radius: 16px; font-size: 15px; line-height: 1.45; }
.dijon-msg.assistant { align-self:flex-start; background:#1476ff; color:#fff; border-bottom-left-radius: 6px; }
.dijon-msg.user { align-self:flex-end; background:#e9eefc; color:#1b1f29; border-bottom-right-radius: 6px; }

/* Typing indicator */
.dijon-typing { align-self:flex-start; display:flex; gap:6px; padding:10px 12px; background:#d6e5ff; color:#1b1f29; border-radius:12px; font-size:13px; }
.dijon-typing .dot { width:6px; height:6px; border-radius:50%; background:#1476ff; opacity:.7; animation: dijon-blink 1.2s infinite ease-in-out; }
.dijon-typing .dot:nth-child(2){ animation-delay: .2s; }
.dijon-typing .dot:nth-child(3){ animation-delay: .4s; }
@keyframes dijon-blink { 0%, 80%, 100% { transform: translateY(0); opacity:.3; } 40% { transform: translateY(-2px); opacity:1; } }

/* Footer (composer) */
.dijon-footer { border-top:1px solid #e6edff; background:#fff; padding:12px; display:flex; gap:10px; }
.dijon-input { flex:1; padding:12px 14px; border-radius: 12px; border:1px solid #cfe0ff; outline:none; font-size:14px; }
.dijon-input::placeholder { color:#98a6c3; }
.dijon-send { background:#1476ff; color:#fff; border:none; border-radius:12px; padding:12px 16px; font-weight:600; cursor:pointer; }
.dijon-send:disabled { opacity:0.6; cursor:not-allowed; }
`;

// Simple per-browser user id
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
- const [open, setOpen] = useState(true);
+ const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I’m Dijon! How can I help you today?" },
  ]);
  const userId = useMemo(getOrCreateUserId, []);
  const scrollRef = useRef(null);

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
        setMessages((m) => [...m, { role: "assistant", content: detail || "Hmm, I hit a snag. Please try again." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: reply || "…" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again in a moment." }]);
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
        <button className="dijon-button" onClick={() => setOpen(true)} aria-label="Open chat">💬</button>
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
