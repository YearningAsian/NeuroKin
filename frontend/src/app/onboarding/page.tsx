"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookHeart,
  Smile,
  Palette,
  Music,
  Dumbbell,
  Code,
  Gamepad2,
  BookOpen,
  Heart,
  Users,
  Loader2,
  Search,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitJournal, submitMood, signup } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { US_SCHOOLS } from "@/lib/schools";

const moodOptions = [
  { emoji: "😊", label: "Happy", color: "bg-amber-100 border-amber-300" },
  { emoji: "😌", label: "Calm", color: "bg-emerald-100 border-emerald-300" },
  { emoji: "😔", label: "Sad", color: "bg-blue-100 border-blue-300" },
  { emoji: "😤", label: "Frustrated", color: "bg-red-100 border-red-300" },
  { emoji: "😰", label: "Anxious", color: "bg-purple-100 border-purple-300" },
  { emoji: "🤔", label: "Reflective", color: "bg-indigo-100 border-indigo-300" },
];

const activityOptions = [
  { icon: Palette, label: "Creative Arts" },
  { icon: Music, label: "Music" },
  { icon: Dumbbell, label: "Sports & Fitness" },
  { icon: Code, label: "Tech & Coding" },
  { icon: Gamepad2, label: "Gaming" },
  { icon: BookOpen, label: "Reading" },
  { icon: Heart, label: "Volunteering" },
  { icon: Users, label: "Socializing" },
];

const valueOptions = [
  "Empathy",
  "Growth",
  "Creativity",
  "Honesty",
  "Kindness",
  "Resilience",
  "Curiosity",
  "Independence",
  "Community",
  "Humor",
];

export default function OnboardingPage() {
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [energyLevel, setEnergyLevel] = useState(5);
  const [socialBattery, setSocialBattery] = useState(5);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [journalText, setJournalText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const filteredSchools = schoolSearch.trim()
    ? US_SCHOOLS.filter((s) =>
        s.toLowerCase().includes(schoolSearch.toLowerCase())
      ).slice(0, 50)
    : US_SCHOOLS.slice(0, 50);

  const toggleActivity = (label: string) => {
    setSelectedActivities((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    );
  };

  const toggleValue = (val: string) => {
    setSelectedValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center animate-fade-in-up">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
        <Brain className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold mb-3">Welcome to NeuroTwin</h1>
      <p className="text-[var(--color-text-muted)] max-w-md mx-auto mb-8 leading-relaxed">
        Let&apos;s build your Emotional Digital Twin. This helps us find peers who
        truly resonate with you. It takes about 2 minutes.
      </p>
      <div className="flex justify-center gap-3">
        <Button size="lg" onClick={() => setStep(1)}>
          Let&apos;s go <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>,

    // Step 1: Account creation
    <div key="name" className="animate-fade-in-up max-w-md mx-auto">
      <Smile className="w-10 h-10 text-[var(--color-primary)] mb-4" />
      <h2 className="text-2xl font-bold mb-2">Create your account</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        Pick a username and password to get started.
      </p>
      {signupError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{signupError}</div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name or nickname"
            className="w-full px-5 py-3 rounded-xl border border-[var(--color-border)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
            placeholder="e.g. alex-t"
            className="w-full px-5 py-3 rounded-xl border border-[var(--color-border)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Letters, numbers, hyphens, and underscores only</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 4 characters"
            className="w-full px-5 py-3 rounded-xl border border-[var(--color-border)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>
    </div>,

    // Step 2: School selection
    <div key="school" className="animate-fade-in-up max-w-md mx-auto">
      <GraduationCap className="w-10 h-10 text-[var(--color-primary)] mb-4" />
      <h2 className="text-2xl font-bold mb-2">Select your school</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        Find your college or university to join your campus community.
      </p>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={schoolSearch}
          onChange={(e) => setSchoolSearch(e.target.value)}
          placeholder="Search schools…"
          className="w-full pl-11 pr-5 py-3 rounded-xl border border-[var(--color-border)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
      </div>
      {selectedSchool && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-sm font-medium flex items-center justify-between">
          <span>{selectedSchool}</span>
          <button
            onClick={() => setSelectedSchool("")}
            className="text-[var(--color-primary)] hover:text-red-500 ml-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {filteredSchools.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
            No schools match &quot;{schoolSearch}&quot;
          </div>
        ) : (
          filteredSchools.map((school, idx) => (
            <button
              key={`${school}-${idx}`}
              onClick={() => {
                setSelectedSchool(school);
                setSchoolSearch("");
              }}
              className={cn(
                "w-full text-left px-4 py-3 text-sm transition-colors",
                selectedSchool === school
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold"
                  : "hover:bg-slate-50"
              )}
            >
              {school}
            </button>
          ))
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mt-3">
        {US_SCHOOLS.length} schools available • scroll or type to filter
      </p>
    </div>,

    // Step 3: Welcome to school community
    <div key="welcome-school" className="text-center animate-fade-in-up">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-emerald-500 flex items-center justify-center">
        <GraduationCap className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold mb-3">
        Welcome to the {selectedSchool || "your school"} community!
      </h1>
      <p className="text-[var(--color-text-muted)] max-w-md mx-auto mb-2 leading-relaxed">
        You&apos;re joining a campus network of students who share meaningful
        connections through their Emotional Digital Twins.
      </p>
      <p className="text-sm text-emerald-600 font-medium">
        🎓 Let&apos;s finish setting up your twin profile
      </p>
    </div>,

    // Step 4: Current mood
    <div key="mood" className="animate-fade-in-up max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-2">How are you feeling right now?</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        This helps us calibrate your initial emotional profile.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {moodOptions.map((m) => (
          <button
            key={m.label}
            onClick={() => setSelectedMood(m.label)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              selectedMood === m.label
                ? `${m.color} border-2 scale-105 shadow-md`
                : "bg-white border-[var(--color-border)] hover:bg-slate-50"
            )}
          >
            <span className="text-3xl">{m.emoji}</span>
            <span className="text-sm font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 5: Energy & Social
    <div key="energy" className="animate-fade-in-up max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2">Your energy levels</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-8">
        Drag the sliders to match how you generally feel.
      </p>
      <div className="space-y-8">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Energy Level</span>
            <span className="text-[var(--color-text-muted)]">{energyLevel}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={energyLevel}
            onChange={(e) => setEnergyLevel(Number(e.target.value))}
            aria-label={`Energy level: ${energyLevel} out of 10`}
            className="w-full accent-[var(--color-primary)] h-2 rounded-full"
          />
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
            <span>Low energy</span>
            <span>High energy</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Social Battery</span>
            <span className="text-[var(--color-text-muted)]">{socialBattery}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={socialBattery}
            onChange={(e) => setSocialBattery(Number(e.target.value))}
            aria-label={`Social battery: ${socialBattery} out of 10`}
            className="w-full accent-[var(--color-accent)] h-2 rounded-full"
          />
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
            <span>Recharge alone</span>
            <span>Love crowds</span>
          </div>
        </div>
      </div>
    </div>,

    // Step 6: Activities
    <div key="activities" className="animate-fade-in-up max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-2">What do you enjoy?</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        Pick as many as you like. This shapes your activity profile.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {activityOptions.map((a) => {
          const Icon = a.icon;
          const selected = selectedActivities.includes(a.label);
          return (
            <button
              key={a.label}
              onClick={() => toggleActivity(a.label)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                selected
                  ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-sm"
                  : "bg-white border-[var(--color-border)] hover:bg-slate-50"
              )}
            >
              <Icon className={cn("w-5 h-5", selected ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]")} />
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>,

    // Step 7: Values
    <div key="values" className="animate-fade-in-up max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-2">What do you value most?</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        Choose up to 5 core values that resonate with you.
      </p>
      <div className="flex flex-wrap gap-2">
        {valueOptions.map((v) => {
          const selected = selectedValues.includes(v);
          return (
            <button
              key={v}
              onClick={() => toggleValue(v)}
              disabled={!selected && selectedValues.length >= 5}
              className={cn(
                "px-4 py-2 rounded-full border-2 text-sm font-medium transition-all",
                selected
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "bg-white border-[var(--color-border)] hover:border-[var(--color-accent)] disabled:opacity-40"
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>,

    // Step 8: First journal entry
    <div key="journal" className="animate-fade-in-up max-w-lg mx-auto">
      <BookHeart className="w-10 h-10 text-[var(--color-warm)] mb-4" />
      <h2 className="text-2xl font-bold mb-2">Your first journal entry</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        Write anything — how your day is going, what&apos;s on your mind, or
        something you&apos;re grateful for. This is private and encrypted.
      </p>
      <textarea
        value={journalText}
        onChange={(e) => setJournalText(e.target.value)}
        rows={6}
        placeholder="Today I'm feeling..."
        className="w-full px-5 py-4 rounded-2xl border border-[var(--color-border)] text-base resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent leading-relaxed"
      />
      <p className="text-xs text-[var(--color-text-muted)] mt-2">
        🔒 Your journal is encrypted and never shared with other students.
      </p>
    </div>,

    // Step 9: Done
    <div key="done" className="text-center animate-fade-in-up">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold mb-3">Your Twin is ready!</h1>
      <p className="text-[var(--color-text-muted)] max-w-md mx-auto mb-2 leading-relaxed">
        We&apos;ve created your initial Emotional Digital Twin. As you journal and
        check in, it&apos;ll grow and find even better connections.
      </p>
      <p className="text-sm text-emerald-600 font-medium mb-8">
        ✨ Your initial compatibility matches are being calculated...
      </p>
      <Link href="/dashboard">
        <Button size="lg">
          Go to Dashboard <ArrowRight className="w-5 h-5" />
        </Button>
      </Link>
    </div>,
  ];

  const totalSteps = steps.length;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  const finishOnboarding = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Create the account first
      const result = await signup(username, name, password, selectedSchool);
      authLogin(result.student_id, result.display_name, result.school ?? selectedSchool);

      // Submit initial mood + journal under the new account
      if (selectedMood) {
        await submitMood({
          student_id: result.student_id,
          mood_label: selectedMood.toLowerCase(),
          energy_level: energyLevel,
          stress_level: 5,
          social_battery: socialBattery,
        });
      }
      if (journalText.trim()) {
        await submitJournal({
          student_id: result.student_id,
          text: journalText,
          mood_label: selectedMood?.toLowerCase(),
          tags: [...selectedActivities, ...selectedValues],
        });
      }
      setStep(step + 1);
    } catch (err) {
      console.error("Onboarding submit failed:", err);
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.includes("409")) {
        setSignupError("That username is already taken. Please go back and pick a different one.");
      } else {
        setSignupError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    // Validate account step
    if (step === 1) {
      if (!name.trim() || !username.trim() || password.length < 4) {
        setSignupError("Please fill in all fields. Password must be at least 4 characters.");
        return;
      }
      setSignupError("");
    }
    // Validate school step
    if (step === 2 && !selectedSchool) {
      setSignupError("Please select your school to continue.");
      return;
    }
    if (step === totalSteps - 2) {
      finishOnboarding();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-soft)] flex flex-col">
      {/* Progress bar */}
      {!isFirst && !isLast && (
        <div className="w-full h-1 bg-slate-200">
          <div
            className="h-1 bg-[var(--color-primary)] transition-all duration-500"
            style={{ width: `${(step / (totalSteps - 2)) * 100}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">{steps[step]}</div>
      </div>

      {/* Navigation */}
      {!isFirst && !isLast && (
        <div className="sticky bottom-0 bg-white border-t border-[var(--color-border)] py-4 px-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <span className="text-sm text-[var(--color-text-muted)]">
              {step} of {totalSteps - 2}
            </span>
            <Button onClick={handleNext} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <>{step === totalSteps - 2 ? "Finish" : "Next"} <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
