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
    const connections: Connection[] = stored ? JSON.parse(stored) : [];
    // Deduplicate messages on load (safeguard against React StrictMode / dirty dev state)
    connections.forEach((c) => {
      const seen = new Set<string>();
      c.chatMessages = c.chatMessages.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    });
    return connections;
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

/* ---------- Initial Chat Generator ---------- */

export function getInitialMessage(
  userName: string,
  peerName: string,
  icebreaker: string,
): ChatMessage[] {
  // Don't auto-send any messages — the icebreaker is displayed
  // on the recommendation card and the user can choose to send it.
  return [];
}
