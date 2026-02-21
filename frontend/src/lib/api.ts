// NeuroKin API client
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JournalEntry {
  student_id: string;
  text: string;
  mood_label?: string;
  tags?: string[];
}

export interface MoodCheckIn {
  student_id: string;
  mood_label: string;
  energy_level: number;
  stress_level: number;
  social_battery: number;
  notes?: string;
}

export interface TwinSnapshot {
  student_id: string;
  display_name: string;
  emotion_distribution: Record<string, number>;
  top_themes: string[];
  activity_preferences: string[];
  mood_stability: number;
  social_energy: number;
  last_updated: string;
}

export interface PeerRecommendation {
  peer_id: string;
  display_name: string;
  compatibility_score: number;
  explanation: string;
  shared_themes: string[];
  icebreaker: string;
}

export async function submitJournal(entry: JournalEntry): Promise<{ status: string; twin_updated: boolean }> {
  const res = await fetch(`${API_BASE}/journal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  return res.json();
}

export async function submitMood(checkin: MoodCheckIn): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkin),
  });
  return res.json();
}

export async function getTwin(studentId: string): Promise<TwinSnapshot> {
  const res = await fetch(`${API_BASE}/twin?student_id=${studentId}`);
  return res.json();
}

export async function getRecommendations(studentId: string): Promise<PeerRecommendation[]> {
  const res = await fetch(`${API_BASE}/recommendations?student_id=${studentId}`);
  return res.json();
}

export async function submitFeedback(studentId: string, peerId: string, accepted: boolean): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, peer_id: peerId, accepted }),
  });
  return res.json();
}

export async function blockUser(studentId: string, blockedId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, blocked_id: blockedId }),
  });
  return res.json();
}

export async function reportUser(studentId: string, reportedId: string, reason: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, reported_id: reportedId, reason }),
  });
  return res.json();
}
