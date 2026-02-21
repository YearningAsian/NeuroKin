"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
import { BookHeart, Send, Lock, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function JournalPage() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? "";
  const [text, setText] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = useCallback(
    () => getJournalEntries(studentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, studentId],
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
      setSelectedPrompt(null);
      // Refresh entries list
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Journal submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={BookHeart}
        iconColor="text-[var(--color-warm)]"
        title="Journal"
        description="Write freely. Your entries are encrypted and shape your Emotional Twin."
      />

      {/* Journal prompts */}
      <div className="animate-fade-in-up">
        <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          Need a prompt? Try one of these:
        </p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => {
                setSelectedPrompt(p);
                setText(p + "\n\n");
              }}
              className={cn(
                "text-sm px-4 py-2 rounded-full border transition-all",
                selectedPrompt === p
                  ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:bg-amber-50"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Writing area */}
      <Card className="animate-fade-in-up">
        <CardContent className="pt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Start writing... What's on your mind?"
            className="w-full text-base leading-relaxed resize-none border-0 outline-none placeholder:text-slate-300 bg-transparent"
          />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Lock className="w-3.5 h-3.5" />
              Encrypted & private
            </div>
            <div className="flex items-center gap-3">
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
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--color-text-muted)]" />
          Recent Entries
        </h2>
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
