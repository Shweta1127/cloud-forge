import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@workspace/api-client-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  projectId?: number;
}

export default function AiChat({ projectId }: AiChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your AI infrastructure assistant. I can help you design cloud architectures, suggest best practices, optimize costs, and explain infrastructure patterns. What are you building today?" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiChat = useAiChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim() || aiChat.isPending) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    aiChat.mutate(
      { data: { message: userMsg.content, projectId: projectId ?? null, history: messages.slice(-6) } },
      {
        onSuccess: (resp) => setMessages((prev) => [...prev, { role: "assistant", content: resp.message }]),
        onError: () => setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]),
      }
    );
  };

  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      {open && (
        <div style={{
          width: 320, height: 460, display: "flex", flexDirection: "column",
          borderRadius: 12, border: "1px solid var(--border2)",
          background: "var(--panel)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderBottom: "1px solid var(--border)",
            background: "var(--bg2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "var(--accent)",
              }}>✦</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--app-font-sans)", color: "var(--text)" }}>CloudForge AI</div>
                <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--app-font-mono)" }}>architecture-assistant</div>
              </div>
            </div>
            <button
              data-testid="button-close-ai-chat"
              onClick={() => setOpen(false)}
              style={{
                width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "1px solid var(--border)", borderRadius: 4,
                color: "var(--text3)", cursor: "pointer", fontSize: 12, transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--danger)"; (e.target as HTMLElement).style.color = "var(--danger)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.color = "var(--text3)"; }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                  background: msg.role === "user" ? "rgba(0,136,255,0.15)" : "rgba(0,212,255,0.12)",
                  border: `1px solid ${msg.role === "user" ? "rgba(0,136,255,0.3)" : "rgba(0,212,255,0.25)"}`,
                  color: msg.role === "user" ? "var(--accent2)" : "var(--accent)",
                }}>
                  {msg.role === "user" ? "U" : "✦"}
                </div>
                <div style={{
                  maxWidth: "82%", borderRadius: 10, padding: "7px 10px", fontSize: 11,
                  lineHeight: 1.5, fontFamily: "var(--app-font-sans)",
                  background: msg.role === "user" ? "rgba(0,136,255,0.1)" : "var(--bg3)",
                  border: `1px solid ${msg.role === "user" ? "rgba(0,136,255,0.2)" : "var(--border)"}`,
                  color: "var(--text)",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiChat.isPending && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)",
                  color: "var(--accent)", fontSize: 10,
                }}>✦</div>
                <div style={{
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "10px 14px", display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 5, height: 5, borderRadius: "50%", background: "var(--text3)",
                      animation: "bounce 1.2s infinite", animationDelay: `${j * 0.15}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", background: "var(--bg2)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                data-testid="input-ai-message"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about architecture..."
                disabled={aiChat.isPending}
                style={{
                  flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: 5, padding: "6px 10px", color: "var(--text)",
                  fontFamily: "var(--app-font-sans)", fontSize: 11, outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
              />
              <button
                data-testid="button-send-ai-message"
                onClick={send}
                disabled={!input.trim() || aiChat.isPending}
                style={{
                  width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--accent2)", border: "1px solid var(--accent2)", borderRadius: 6,
                  color: "white", cursor: "pointer", fontSize: 13, transition: "all 0.15s",
                  opacity: !input.trim() || aiChat.isPending ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (input.trim()) (e.currentTarget).style.background = "var(--accent)"; }}
                onMouseLeave={e => { (e.currentTarget).style.background = "var(--accent2)"; }}
              >↑</button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        data-testid="button-toggle-ai-chat"
        onClick={() => setOpen(!open)}
        style={{
          width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          background: open ? "var(--panel)" : "var(--accent2)",
          border: open ? "2px solid rgba(0,212,255,0.4)" : "1px solid var(--accent2)",
          color: open ? "var(--accent)" : "white",
          cursor: "pointer", fontSize: 18, transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget).style.background = "var(--accent)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget).style.background = "var(--accent2)"; }}
      >
        {open ? "↓" : "✦"}
      </button>
    </div>
  );
}
