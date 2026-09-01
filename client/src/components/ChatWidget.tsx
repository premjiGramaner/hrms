import React, { useEffect, useRef, useState } from "react";
import { sendChatMessage, checkChatbotHealth, type ChatResponse } from "../api/chatbot.api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  intent?: string;
  confidence?: number;
  loading?: boolean;
}

// ── Small helpers ──────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

const SUGGESTIONS = [
  "Show my profile",
  "What is my leave balance?",
  "Who is my manager?",
  "What department am I in?",
];

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "bot",
      text: "Hi! I'm your HR assistant. Ask me anything about employees, leave balances, or your profile.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`sess_${uid()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Health check on first open
  useEffect(() => {
    if (open && online === null) {
      checkChatbotHealth().then(setOnline);
    }
  }, [open, online]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: uid(), role: "user", text: trimmed };
    const loadingMsg: Message = { id: uid(), role: "bot", text: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: ChatResponse = await sendChatMessage({
        message: trimmed,
        session_id: sessionId,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                text: res.answer,
                intent: res.intent,
                confidence: res.confidence,
                loading: false,
              }
            : m,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, text: `Error: ${msg}`, loading: false }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Floating button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close HR assistant" : "Open HR assistant"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg,#233B86,#12C7A5)" }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="white" />
            <circle cx="12" cy="10" r="1" fill="white" />
            <circle cx="15" cy="10" r="1" fill="white" />
          </svg>
        )}

        {/* Unread dot — shown only when closed */}
        {!open && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white" />
        )}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none"
        }`}
        style={{ width: 360, height: 520, background: "#fff" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#233B86,#12C7A5)" }}
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">HR Assistant</p>
            <p className="text-white/70 text-xs leading-tight flex items-center gap-1">
              {online === null ? (
                "Connecting…"
              ) : online ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300" />
                  Online
                </>
              ) : (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                  Offline — start chatbot server
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white transition p-1"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Quick suggestions — show only when only the greeting exists */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading || online === false}
            placeholder={
              online === false
                ? "Chatbot server is offline"
                : "Ask about an employee…"
            }
            className="flex-1 text-sm rounded-full border border-slate-200 px-4 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || online === false}
            aria-label="Send"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg,#233B86,#12C7A5)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (msg.loading) {
    return (
      <div className="flex items-end gap-2">
        <BotAvatar />
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1 items-center h-4">
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] text-sm px-4 py-2.5 rounded-2xl rounded-br-sm text-white shadow-sm"
          style={{ background: "linear-gradient(135deg,#233B86,#12C7A5)" }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  // Format multi-line bot answers (profile, leave balance)
  const lines = msg.text.split("\n");
  const isMultiLine = lines.length > 2;

  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div
        className={`max-w-[80%] text-sm bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm text-slate-800 overflow-hidden ${
          isMultiLine ? "font-mono text-xs" : ""
        }`}
      >
        {isMultiLine ? (
          <div className="space-y-0.5">
            {lines.map((line, i) => {
              const isHeader = i === 0 && line.startsWith("👤");
              const isEmpty  = line.trim() === "";
              const isField  = line.startsWith("  ");
              if (isEmpty) return <div key={i} className="h-1" />;
              if (isHeader) return (
                <div key={i} className="font-bold text-slate-900 text-sm mb-1">
                  {line}
                </div>
              );
              if (isField) {
                const [label, ...rest] = line.trim().split(/\s{2,}/);
                const value = rest.join("  ");
                return (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-slate-500 w-24 flex-shrink-0">{label}</span>
                    <span className="text-slate-800 font-medium break-all min-w-0">{value}</span>
                  </div>
                );
              }
              return (
                <div key={i} className={line.startsWith("  •") ? "pl-1 text-slate-700 text-xs" : "font-semibold text-slate-900 text-xs"}>
                  {line || "\u00A0"}
                </div>
              );
            })}
          </div>
        ) : (
          msg.text
        )}
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5"
      style={{ background: "linear-gradient(135deg,#233B86,#12C7A5)" }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
}
