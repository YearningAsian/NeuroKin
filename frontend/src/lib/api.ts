/**
 * NeuroTwin API Client
 *
 * Centralised HTTP client for all backend communication.
 * Every function corresponds to a single REST endpoint on the FastAPI backend.
 * All responses are type-safe via generics and Pydantic-aligned interfaces.
 *
 * @module api
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Parse a fetch Response, throwing a descriptive error on non-2xx status.
 */
async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`API ${res.status}: ${payload}`);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---

/** Server response after signup or login. */
export interface AuthResponse {
  status: string;
  student_id: string;
  display_name: string;
}

/** Create a new student account and return session info. */
export async function signup(studentId: string, displayName: string, password: string, school: string = ""): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, display_name: displayName, password, school }),
  });
  return parseResponse(res);
}

/** Authenticate an existing student. */
export async function login(studentId: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, password }),
  });
  return parseResponse(res);
}

/** Payload shape for creating a journal entry. */
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

/** The Emotional Digital Twin snapshot returned by the backend. */
export interface TwinSnapshot {
  student_id: string;
  display_name: string;
  emotion_distribution: Record<string, number>;
  top_themes: string[];
  activity_preferences: string[];
  mood_stability: number;
  social_energy: number;
  shared_values_tags: string[];
  schedule_overlap: number;
  last_updated: string;
}

/** A recommended peer with compatibility score and icebreaker. */
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
  return parseResponse(res);
}

export async function submitMood(checkin: MoodCheckIn): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkin),
  });
  return parseResponse(res);
}

export async function getTwin(studentId: string): Promise<TwinSnapshot> {
  const res = await fetch(`${API_BASE}/twin?student_id=${studentId}`);
  return parseResponse(res);
}

export async function getRecommendations(studentId: string): Promise<PeerRecommendation[]> {
  const res = await fetch(`${API_BASE}/recommendations?student_id=${studentId}`);
  return parseResponse(res);
}

export async function submitFeedback(studentId: string, peerId: string, accepted: boolean): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, peer_id: peerId, accepted }),
  });
  return parseResponse(res);
}

export async function blockUser(studentId: string, blockedId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, blocked_id: blockedId }),
  });
  return parseResponse(res);
}

export async function reportUser(studentId: string, reportedId: string, reason: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, reported_id: reportedId, reason }),
  });
  return parseResponse(res);
}

// --- Additional API functions ---

export interface JournalEntryPreview {
  text: string;
  mood_label: string | null;
  tags: string[];
  created_at: string;
}

export interface MoodHistoryEntry {
  mood_label: string;
  energy_level: number;
  stress_level: number;
  social_battery: number;
  created_at: string;
}

export async function getJournalEntries(studentId: string, limit = 20): Promise<JournalEntryPreview[]> {
  const res = await fetch(`${API_BASE}/journal?student_id=${studentId}&limit=${limit}`);
  return parseResponse(res);
}

export async function getMoodHistory(studentId: string, limit = 7): Promise<MoodHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/mood/history?student_id=${studentId}&limit=${limit}`);
  return parseResponse(res);
}

export async function deleteAccount(studentId: string): Promise<{ status: string; deleted: string }> {
  const res = await fetch(`${API_BASE}/account?student_id=${studentId}`, {
    method: "DELETE",
  });
  return parseResponse(res);
}

export async function submitConsent(studentId: string, consented: boolean): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, consented }),
  });
  return parseResponse(res);
}

export async function submitActivity(
  studentId: string,
  activityType: string,
  description?: string,
  durationMins?: number,
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: studentId,
      activity_type: activityType,
      description,
      duration_mins: durationMins,
    }),
  });
  return parseResponse(res);
}
