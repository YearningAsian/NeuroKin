"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
import { BookHeart, Send, Lock, Clock, Loader2, Mic, MicOff, SmilePlus } from "lucide-react";
import { submitJournal, submitMood, getJournalEntries, getMoodHistory, type JournalEntryPreview, type MoodHistoryEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/hooks/useFetch";
import { cn } from "@/lib/utils";

const prompts = [
  "What's been on your mind today?",
  "What are you grateful for right now?",
  "Describe a challenge you're facing.",
  "What made you smile recently?",
  "How do you feel about your friendships?",
  "What would make tomorrow great?",
];

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  sad: "😔",
  frustrated: "😤",
  anxious: "😰",
  reflective: "🤔",
  tired: "😴",
  excited: "🤩",
};

const moods = [
  { emoji: "😊", label: "Happy", color: "bg-amber-100 border-amber-300 hover:bg-amber-200" },
  { emoji: "😌", label: "Calm", color: "bg-emerald-100 border-emerald-300 hover:bg-emerald-200" },
  { emoji: "😔", label: "Sad", color: "bg-blue-100 border-blue-300 hover:bg-blue-200" },
  { emoji: "😤", label: "Frustrated", color: "bg-red-100 border-red-300 hover:bg-red-200" },
  { emoji: "😰", label: "Anxious", color: "bg-purple-100 border-purple-300 hover:bg-purple-200" },
  { emoji: "🤔", label: "Reflective", color: "bg-indigo-100 border-indigo-300 hover:bg-indigo-200" },
  { emoji: "😴", label: "Tired", color: "bg-slate-100 border-slate-300 hover:bg-slate-200" },
  { emoji: "🤩", label: "Excited", color: "bg-pink-100 border-pink-300 hover:bg-pink-200" },
];

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    heresSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function JournalPage() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? "";
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tried, setTried] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [entriesLimit, setEntriesLimit] = useState(5);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isMoodListening, setIsMoodListening] = useState(false);
  const moodRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Mood check-in state
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [social, setSocial] = useState(5);
  const [moodNotes, setMoodNotes] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const speechSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const fetcher = useCallback(
    () => getJournalEntries(studentId, entriesLimit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, studentId, entriesLimit],
  );
  const { data: entries, loading: entriesLoading } = useFetch(fetcher);

  const moodFetcher = useCallback(
    () => getMoodHistory(studentId, 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, studentId],
  );
  const { data: moodHistory } = useFetch(moodFetcher);

  const handleSubmit = async () => {
    setTried(true);
    const hasText = text.trim().length > 0;
    if (!hasText || submitting) return;
    setSubmitting(true);
    try {
      // Submit journal entry
      await submitJournal({
        student_id: studentId,
        text,
        mood_label: selectedMood?.toLowerCase(),
      });
      // Submit mood check-in if a mood is selected
      if (selectedMood) {
        await submitMood({
          student_id: studentId,
          mood_label: selectedMood.toLowerCase(),
          energy_level: energy,
          stress_level: stress,
          social_battery: social,
          notes: moodNotes || undefined,
        });
      }
      setToastMessage(
        selectedMood
          ? "Journal & mood submitted! Your Twin is updating..."
          : "Journal submitted! Your Twin is updating...",
      );
      setSubmitted(true);
      setTried(false);
      setTimeout(() => setSubmitted(false), 3000);
      setText("");
      setSelectedMood(null);
      setEnergy(5);
      setStress(5);
      setSocial(5);
      setMoodNotes("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setText((prev) => (prev.trim() ? `${prev}\n${transcript}` : transcript));
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const toggleMoodListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isMoodListening && moodRecognitionRef.current) {
      moodRecognitionRef.current.stop();
      setIsMoodListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setMoodNotes((prev) => (prev.trim() ? `${prev}\n${transcript}` : transcript));
      }
    };
    recognition.onend = () => setIsMoodListening(false);
    recognition.onerror = () => setIsMoodListening(false);
    moodRecognitionRef.current = recognition;
    setIsMoodListening(true);
    recognition.start();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={BookHeart}
        iconColor="text-[var(--color-warm)]"
        title="Journal"
        description="Write, speak, and check in. Your entries are encrypted and shape your Emotional Twin."
      />

      {/* ── Mood Check-in ── */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SmilePlus className="w-5 h-5 text-emerald-500" />
            Mood Check-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {moods.map((m) => (
              <button
                key={m.label}
                onClick={() => setSelectedMood(m.label)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                  selectedMood === m.label
                    ? `${m.color} scale-105 shadow-md`
                    : "bg-white border-[var(--color-border)] hover:bg-slate-50"
                )}
              >
                <span className={cn("text-2xl", selectedMood === m.label && "pulse-soft")}>
                  {m.emoji}
                </span>
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Energy</span>
                <span className="text-[var(--color-text-muted)] font-semibold">{energy}/10</span>
              </div>
              <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} aria-label={`Energy level: ${energy} out of 10`} className="w-full accent-amber-500 h-2" />
              <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1"><span>Low</span><span>High</span></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Stress</span>
                <span className="text-[var(--color-text-muted)] font-semibold">{stress}/10</span>
              </div>
              <input type="range" min={1} max={10} value={stress} onChange={(e) => setStress(Number(e.target.value))} aria-label={`Stress level: ${stress} out of 10`} className="w-full accent-red-500 h-2" />
              <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1"><span>Relaxed</span><span>Stressed</span></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Social Battery</span>
                <span className="text-[var(--color-text-muted)] font-semibold">{social}/10</span>
              </div>
              <input type="range" min={1} max={10} value={social} onChange={(e) => setSocial(Number(e.target.value))} aria-label={`Social battery: ${social} out of 10`} className="w-full accent-blue-500 h-2" />
              <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1"><span>Need alone</span><span>Social</span></div>
            </div>
          </div>

          {/* Optional mood notes */}
          <textarea
            value={moodNotes}
            onChange={(e) => setMoodNotes(e.target.value)}
            rows={2}
            placeholder="Anything else to add? (optional)"
            className="w-full text-sm leading-relaxed resize-none border border-[var(--color-border)] rounded-xl px-4 py-2 outline-none placeholder:text-slate-300 bg-transparent"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[var(--color-text-muted)]">{moodNotes.length} characters</span>
            {speechSupported && (
              <Button
                onClick={toggleMoodListening}
                variant={isMoodListening ? "secondary" : "outline"}
                size="sm"
              >
                {isMoodListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isMoodListening ? "Stop" : "Speak"}
              </Button>
            )}
          </div>

          {/* Recent moods mini-row */}
          {moodHistory && moodHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Recent moods</p>
              <div className="flex gap-2">
                {moodHistory.slice(0, 7).map((m: MoodHistoryEntry, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-lg">{MOOD_EMOJI[m.mood_label] ?? "📝"}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {new Date(m.created_at).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journal prompts */}
      <div className="animate-fade-in-up">
        <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Suggestions:
        </p>
        <div
          className="overflow-hidden select-none pointer-events-none"
          style={{ maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)" }}
        >
          <div className="flex w-max animate-marquee" style={{ ["--marquee-duration" as string]: "40s" }}>
            <div className="flex gap-3 shrink-0 pr-3">
              {prompts.map((p) => (
                <div
                  key={p}
                  className="text-sm px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] bg-white/70 whitespace-nowrap"
                >
                  {p}
                </div>
              ))}
            </div>
            <div className="flex gap-3 shrink-0 pr-3" aria-hidden>
              {prompts.map((p) => (
                <div
                  key={`dup-${p}`}
                  className="text-sm px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] bg-white/70 whitespace-nowrap"
                >
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Writing area */}
      <Card className={cn("animate-fade-in-up", tried && !text.trim() && "ring-2 ring-red-400")}>
        <CardContent className="pt-6">
          {tried && !text.trim() && (
            <p className="text-xs text-red-500 mb-2 font-medium">Please write something before submitting.</p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Start writing or speaking... What's on your mind? *"
            className={cn(
              "w-full text-base leading-relaxed resize-none border-0 outline-none placeholder:text-slate-300 bg-transparent",
              tried && !text.trim() && "placeholder:text-red-400"
            )}
          />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Lock className="w-3.5 h-3.5" />
              Encrypted & private
            </div>
            <div className="flex items-center gap-3">
              {speechSupported && (
                <Button
                  onClick={toggleListening}
                  variant={isListening ? "secondary" : "outline"}
                  size="sm"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening ? "Stop" : "Speak"}
                </Button>
              )}
              <span className="text-xs text-[var(--color-text-muted)]">
                {text.length} characters
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submitted toast */}
      <Toast
        message={toastMessage}
        visible={submitted}
        onDismiss={() => setSubmitted(false)}
      />

      {/* Past entries (real data from API) */}
      <div className="animate-fade-in-up">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-text-muted)]" />
            {entriesLimit > 5 ? "All Entries" : "Recent Entries"}
          </h2>
          {entriesLimit <= 5 && (
            <Button variant="ghost" size="sm" onClick={() => setEntriesLimit(100)}>
              View all entries
            </Button>
          )}
        </div>
        {entriesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-start gap-4 py-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-200 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-14 bg-slate-200 rounded-full" />
                      <div className="h-5 w-16 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (!entries || entries.length === 0) ? (
          <EmptyState
            icon={BookHeart}
            title="No entries yet"
            description="Write your first journal entry above to get started."
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry: JournalEntryPreview, idx: number) => (
              <Card key={idx} className="card-hover">
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="text-2xl mt-1">
                    {MOOD_EMOJI[entry.mood_label ?? ""] ?? "📝"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--color-text-muted)] mb-1">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString()
                        : "Recent"}
                    </div>
                    <p className="text-sm text-[var(--color-text)] truncate">
                      {entry.text}
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {entry.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[var(--color-text-muted)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
