"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getConnections,
  appendMessage,
  type Connection,
  type ChatMessage,
} from "@/lib/connections";

const getThumbUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

/* ── Single chat window ── */
function ChatWindow({
  connection,
  userName,
  studentId,
  onClose,
}: {
  connection: Connection;
  userName: string;
  studentId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(connection.chatMessages);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Keep messages in sync with localStorage
  useEffect(() => {
    const sync = () => {
      const conns = getConnections(studentId);
      const c = conns.find((cn) => cn.peerId === connection.peerId);
      if (c) {
        // StrictMode protection: deduplicate the array by ID before setting state
        const seen = new Set<string>();
        const unique = c.chatMessages.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        setMessages(unique);
      }
    };
    window.addEventListener("connections-updated", sync);
    return () => window.removeEventListener("connections-updated", sync);
  }, [studentId, connection.peerId]);

  // Scroll to bottom on new messages and typing state
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping]);

  const getBotReply = (userText: string) => {
    const lower = userText.toLowerCase();
    if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) return "Hey there! How's it going?";
    if (lower.includes("how are you")) return "I'm doing pretty well, thanks for asking! Just been working on some stuff. How about you?";
    if (lower.includes("what are you up to") || lower.includes("doing")) return "Just relaxing at the moment. It's nice to meet someone new on here!";
    if (lower.includes("cool") || lower.includes("nice") || lower.includes("awesome")) return "Right? I was pleasantly surprised to see how much we have in common.";
    if (lower.includes("music")) return "I literally can't focus without music. What kind of artists are you into lately?";
    if (lower.includes("school") || lower.includes("class")) return "School has been really intense lately... I definitely need more breaks. Are your classes hard this semester?";
    if (lower.includes("yes") || lower.includes("yeah") || lower.includes("yep")) return "Totally agree. It's so refreshing to hear someone else say that!";
    if (lower.length > 20) return "That's really interesting. Tell me more about that!";
    return "Haha yeah, I totally feel that! Honestly I've been thinking about getting more into that kind of thing. What are your thoughts?";
  };

  const handleSend = () => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `usr-${crypto.randomUUID()}`,
      sender: "user",
      senderName: userName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    // appendMessage already fires 'connections-updated' which will sync our state
    appendMessage(studentId, connection.peerId, msg);
<<<<<<< HEAD
=======
    // Don't manually append — the "connections-updated" event listener
    // will sync messages from localStorage to avoid duplicates.
>>>>>>> dev
    setText("");

    // Simulate human typing delay
    setIsTyping(true);
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `peer-${crypto.randomUUID()}`,
        sender: "peer_twin",
        senderName: connection.displayName,
        text: getBotReply(msg.text),
        timestamp: new Date().toISOString(),
      };
      appendMessage(studentId, connection.peerId, replyMsg);
      setIsTyping(false);
    }, 1500 + Math.random() * 1500); // 1.5s to 3s delay
  };

  return (
    <div className="w-[320px] h-[420px] bg-white rounded-t-xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-primary)] text-white flex-shrink-0">
        <img
          src={getThumbUrl(connection.displayName)}
          alt=""
          className="w-7 h-7 rounded-full border border-white/40 bg-white"
        />
        <span className="font-semibold text-sm flex-1 truncate">{connection.displayName}</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/20 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[var(--color-surface-soft)]">
        {messages.map((m) => {
          const isMe = m.sender === "user_twin" || m.sender === "user";
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-[var(--color-text-muted)] mb-0.5 px-1">
                {m.senderName}
              </span>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                  ? "bg-[var(--color-primary)] text-white rounded-br-md"
                  : "bg-white border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-md"
                  }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex flex-col items-start animate-fade-in-up">
            <span className="text-[10px] text-[var(--color-text-muted)] mb-0.5 px-1">
              {connection.displayName} is typing...
            </span>
            <div className="bg-white border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-2xl rounded-bl-md text-sm">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-border)] bg-white flex-shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Aa"
          className="flex-1 text-sm px-3 py-1.5 rounded-full bg-slate-100 border-0 outline-none placeholder:text-slate-400"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-1.5 rounded-full text-[var(--color-primary)] hover:bg-slate-100 disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Main ChatWidget (bottom-right overlay) ── */
export default function ChatWidget() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? "";
  const userName = user?.displayName ?? "You";

  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeChatPeer, setActiveChatPeer] = useState<string | null>(null);

  const refreshConnections = useCallback(() => {
    if (studentId) setConnections(getConnections(studentId));
  }, [studentId]);

  // Listen for connection changes
  useEffect(() => {
    refreshConnections();
    window.addEventListener("connections-updated", refreshConnections);
    return () => window.removeEventListener("connections-updated", refreshConnections);
  }, [refreshConnections]);

  // Also listen for the "open-chat" custom event from the connections page
  useEffect(() => {
    const handler = (e: Event) => {
      const peerId = (e as CustomEvent<string>).detail;
      setActiveChatPeer(peerId);
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []);

  if (!studentId || connections.length === 0) return null;

  const activeConnection = connections.find((c) => c.peerId === activeChatPeer);

  return (
    <div className="fixed bottom-0 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Chat window */}
      {activeConnection && (
        <ChatWindow
          key={activeConnection.peerId}
          connection={activeConnection}
          userName={userName}
          studentId={studentId}
          onClose={() => setActiveChatPeer(null)}
        />
      )}

      {/* Avatar bubbles */}
      <div className="flex gap-2 pb-4">
        {connections.map((c) => (
          <button
            key={c.peerId}
            onClick={() =>
              setActiveChatPeer((prev) => (prev === c.peerId ? null : c.peerId))
            }
            className={`relative w-11 h-11 rounded-full border-2 shadow-lg transition-all hover:scale-110 ${activeChatPeer === c.peerId
              ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30"
              : "border-white"
              }`}
            title={c.displayName}
          >
            <img
              src={getThumbUrl(c.displayName)}
              alt={c.displayName}
              className="w-full h-full rounded-full bg-white"
            />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
          </button>
        ))}
      </div>
    </div>
  );
}
