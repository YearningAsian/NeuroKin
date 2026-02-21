"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
import { BookHeart, Send, Lock, Clock, Loader2, Mic, MicOff } from "lucide-react";
import { submitJournal, getJournalEntries, type JournalEntryPreview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/hooks/useFetch";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [entriesLimit, setEntriesLimit] = useState(5);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const speechSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const container = suggestionsRef.current;
    if (!container) return;

    const interval = window.setInterval(() => {
      if (!container) return;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;
      if (container.scrollLeft >= maxScrollLeft - 1) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: 1, behavior: "auto" });
      }
    }, 25);

    return () => window.clearInterval(interval);
  }, []);

  const fetcher = useCallback(
    () => getJournalEntries(studentId, entriesLimit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, studentId, entriesLimit],
  );
  const { data: entries, loading: entriesLoading } = useFetch(fetcher);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitJournal({ student_id: studentId, text });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setText("");
      // Refresh entries list
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Journal submit failed:", err);
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

  return (
    <div className="space-y-8">
      <PageHeader
        icon={BookHeart}
        iconColor="text-[var(--color-warm)]"
        title="Journal"
        description="Write or speak freely. Your entries are encrypted and shape your Emotional Twin."
      />

      {/* Journal prompts */}
      <div className="animate-fade-in-up">
        <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Suggestions:
        </p>
        <div ref={suggestionsRef} className="overflow-x-auto pb-1">
          <div className="inline-flex gap-2 min-w-max">
          {prompts.map((p) => (
            <div
              key={p}
              className="text-sm px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] bg-white/70"
            >
              {p}
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Writing area */}
      <Card className="animate-fade-in-up">
        <CardContent className="pt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Start writing or speaking... What's on your mind?"
            className="w-full text-base leading-relaxed resize-none border-0 outline-none placeholder:text-slate-300 bg-transparent"
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
                disabled={!text.trim() || submitting}
                size="sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit Entry"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submitted toast */}
      <Toast
        message="Journal submitted! Your Twin is updating..."
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
