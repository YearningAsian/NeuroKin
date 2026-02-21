"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookHeart, Send, Lock, Sparkles, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitJournal } from "@/lib/api";
import { DEMO_STUDENT_ID } from "@/lib/user";

const prompts = [
  "What's been on your mind today?",
  "What are you grateful for right now?",
  "Describe a challenge you're facing.",
  "What made you smile recently?",
  "How do you feel about your friendships?",
  "What would make tomorrow great?",
];

const pastEntries = [
  {
    date: "Today, 2:30 PM",
    preview: "I've been thinking about how much better I feel when I take time to...",
    mood: "😌",
    themes: ["Reflection", "Gratitude"],
  },
  {
    date: "Yesterday, 9:15 PM",
    preview: "Had a really interesting conversation in class today about...",
    mood: "😊",
    themes: ["Social", "Growth"],
  },
  {
    date: "Feb 19, 4:00 PM",
    preview: "Feeling a bit overwhelmed with deadlines but I know I can...",
    mood: "😰",
    themes: ["Stress", "Resilience"],
  },
];

export default function JournalPage() {
  const [text, setText] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitJournal({ student_id: DEMO_STUDENT_ID, text });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setText("");
      setSelectedPrompt(null);
    } catch (err) {
      console.error("Journal submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          <BookHeart className="w-8 h-8 text-[var(--color-warm)]" />
          Journal
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Write freely. Your entries are encrypted and shape your Emotional Twin.
        </p>
      </div>

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
      {submitted && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in-up z-50">
          <Sparkles className="w-5 h-5" />
          Journal submitted! Your Twin is updating...
        </div>
      )}

      {/* Past entries */}
      <div className="animate-fade-in-up">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--color-text-muted)]" />
          Recent Entries
        </h2>
        <div className="space-y-3">
          {pastEntries.map((entry, i) => (
            <Card key={i} className="card-hover cursor-pointer">
              <CardContent className="flex items-start gap-4 py-4">
                <div className="text-2xl mt-1">{entry.mood}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">{entry.date}</div>
                  <p className="text-sm text-[var(--color-text)] truncate">{entry.preview}</p>
                  <div className="flex gap-1.5 mt-2">
                    {entry.themes.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[var(--color-text-muted)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
