/**
 * Connection & Chat State Management
 *
 * Manages peer connections and twin-to-twin chat messages using localStorage.
 * Each student's connections are stored under a unique key so multiple
 * demo accounts can coexist in the same browser.
 *
 * @module connections
 */

export interface ChatMessage {
  id: string;
  sender: "user_twin" | "peer_twin" | "user";
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Connection {
  peerId: string;
  displayName: string;
  compatibilityScore: number;
  sharedThemes: string[];
  explanation: string;
  icebreaker: string;
  chatMessages: ChatMessage[];
  connectedAt: string;
}

const STORAGE_KEY = "neurotwin_connections";

export function getConnections(studentId: string): Connection[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${studentId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveConnections(studentId: string, connections: Connection[]): void {
  localStorage.setItem(`${STORAGE_KEY}_${studentId}`, JSON.stringify(connections));
  window.dispatchEvent(new Event("connections-updated"));
}

export function addConnection(studentId: string, connection: Connection): Connection[] {
  const connections = getConnections(studentId);
  if (!connections.find((c) => c.peerId === connection.peerId)) {
    connections.push(connection);
    saveConnections(studentId, connections);
  }
  return connections;
}

export function removeConnection(studentId: string, peerId: string): Connection[] {
  const connections = getConnections(studentId).filter((c) => c.peerId !== peerId);
  saveConnections(studentId, connections);
  return connections;
}

export function appendMessage(
  studentId: string,
  peerId: string,
  message: ChatMessage,
): Connection[] {
  const connections = getConnections(studentId);
  const conn = connections.find((c) => c.peerId === peerId);
  if (conn) {
    conn.chatMessages.push(message);
    saveConnections(studentId, connections);
  }
  return connections;
}

/* ---------- AI twin-to-twin conversation generator ---------- */

export function generateTwinConversation(
  userName: string,
  peerName: string,
  sharedThemes: string[],
  icebreaker: string,
): ChatMessage[] {
  const t = sharedThemes.slice(0, 3);
  const ts = Date.now();

  const lines: { sender: "user_twin" | "peer_twin"; text: string }[] = [
    {
      sender: "user_twin",
      text: icebreaker,
    },
    {
      sender: "peer_twin",
      text: `That's a really thoughtful way to start! I've been reflecting on ${t[0] || "similar things"} a lot lately.`,
    },
    {
      sender: "user_twin",
      text: `Right? I find that ${t[0] || "it"} helps me understand myself on a deeper level.${t[1] ? ` I've also been exploring ${t[1]}.` : ""}`,
    },
    {
      sender: "peer_twin",
      text: `I relate to that so much.${t[1] ? ` ${t[1]} is something I think about often too.` : ""} It's nice to find someone who sees things the same way.`,
    },
    {
      sender: "user_twin",
      text: `Totally. For me it's about finding people who genuinely understand.${t[2] ? ` I think ${t[2]} is what really brings people together.` : ""}`,
    },
    {
      sender: "peer_twin",
      text: "I couldn't agree more. I feel like we'd have a lot of great conversations. Let's definitely keep in touch! 😊",
    },
    {
      sender: "user_twin",
      text: "Absolutely! Looking forward to it 💛",
    },
  ];

  return lines.map((l, i) => ({
    id: `twin-${ts}-${i}`,
    sender: l.sender,
    senderName: l.sender === "user_twin" ? `${userName}'s Twin` : `${peerName}'s Twin`,
    text: l.text,
    timestamp: new Date(ts + i * 25_000).toISOString(),
  }));
}
