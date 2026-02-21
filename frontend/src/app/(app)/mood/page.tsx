"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast } from "@/components/ui/Toast";
import { SmilePlus, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitMood } from "@/lib/api";
import { DEMO_STUDENT_ID } from "@/lib/user";

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

export default function MoodPage() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [social, setSocial] = useState(5);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMood || submitting) return;
    setSubmitting(true);
    try {
      await submitMood({
        student_id: DEMO_STUDENT_ID,
        mood_label: selectedMood.toLowerCase(),
        energy_level: energy,
        stress_level: stress,
        social_battery: social,
        notes: notes || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSelectedMood(null);
        setEnergy(5);
        setStress(5);
        setSocial(5);
        setNotes("");
      }, 3000);
    } catch (err) {
      console.error("Mood submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={SmilePlus}
        iconColor="text-emerald-500"
        title="Mood Check-in"
        description="How are you feeling? This updates your Emotional Twin in real time."
      />

      {/* Mood selection */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>Select your mood</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {moods.map((m) => (
              <button
                key={m.label}
                onClick={() => setSelectedMood(m.label)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                  selectedMood === m.label
                    ? `${m.color} scale-105 shadow-md`
                    : "bg-white border-[var(--color-border)] hover:bg-slate-50"
                )}
              >
                <span className={cn("text-3xl", selectedMood === m.label && "pulse-soft")}>
                  {m.emoji}
                </span>
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sliders */}
      <div className="grid md:grid-cols-3 gap-4 animate-fade-in-up">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-3">
              <span className="font-medium">Energy Level</span>
              <span className="text-[var(--color-text-muted)] font-semibold">{energy}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full accent-amber-500 h-2"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-3">
              <span className="font-medium">Stress Level</span>
              <span className="text-[var(--color-text-muted)] font-semibold">{stress}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full accent-red-500 h-2"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
              <span>Relaxed</span>
              <span>Stressed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-3">
              <span className="font-medium">Social Battery</span>
              <span className="text-[var(--color-text-muted)] font-semibold">{social}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={social}
              onChange={(e) => setSocial(Number(e.target.value))}
              className="w-full accent-blue-500 h-2"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
              <span>Need alone time</span>
              <span>Social mode</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card className="animate-fade-in-up">
        <CardContent className="pt-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything else to add? (optional)"
            className="w-full text-sm leading-relaxed resize-none border-0 outline-none placeholder:text-slate-300 bg-transparent"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end animate-fade-in-up">
        <Button onClick={handleSubmit} disabled={!selectedMood || submitting} size="lg">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? "Submitting..." : "Submit Check-in"}
        </Button>
      </div>

      <Toast
        message="Mood recorded! Your Twin has been updated."
        visible={submitted}
        onDismiss={() => setSubmitted(false)}
      />
    </div>
  );
}
