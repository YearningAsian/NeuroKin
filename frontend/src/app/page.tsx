"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Brain,
  Heart,
  Shield,
  Sparkles,
  Users,
  BookHeart,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Emotional Digital Twin",
    description:
      "We build a dynamic emotional profile from your journals, moods, and activities — your evolving digital twin.",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: Heart,
    title: "Deep Compatibility",
    description:
      "Matching goes beyond shared classes. We measure emotional resonance, coping styles, and social energy.",
    color: "bg-rose-100 text-rose-600",
  },
  {
    icon: Users,
    title: "Meaningful Connections",
    description:
      "Get paired with peers who truly get you. Only connections above 50% compatibility are shown.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your raw journals are never shared. We use encrypted, privacy-preserving AI to keep your data safe.",
    color: "bg-emerald-100 text-emerald-700",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Journal & Check In",
    description:
      "Write about your day, check in your mood, or log activities. It only takes a minute.",
  },
  {
    step: "02",
    title: "Your Twin Evolves",
    description:
      "AI builds your Emotional Digital Twin — a rich, nuanced understanding of who you are.",
  },
  {
    step: "03",
    title: "Find Your People",
    description:
      "NeuroKin matches you with emotionally compatible peers and gives you a personalized icebreaker.",
  },
];

const categories = [
  { label: "Stress less", emoji: "🌿" },
  { label: "Find connection", emoji: "🤝" },
  { label: "Process thoughts", emoji: "💭" },
  { label: "Build confidence", emoji: "✨" },
  { label: "Manage anxiety", emoji: "🌊" },
  { label: "Grow together", emoji: "🌱" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Top banner */}
      <div className="bg-[var(--color-primary)] text-center py-2 text-sm font-medium text-white">
        NeuroKin — Emotionally intelligent student connections →
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              Neuro<span className="text-[var(--color-primary)]">Kin</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-muted)]">
            <a href="#features" className="hover:text-[var(--color-text)]">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--color-text)]">How It Works</a>
            <a href="#safety" className="hover:text-[var(--color-text)]">Safety</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section — Headspace-inspired */}
      <section className="blob-bg relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
                Everything your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)] animate-gradient">
                  mind needs
                </span>{" "}
                to connect
              </h1>
              <p className="mt-6 text-lg text-[var(--color-text-muted)] max-w-xl leading-relaxed">
                NeuroKin builds your Emotional Digital Twin to find peers who
                truly understand you. Journal, check in, and discover
                meaningful connections — backed by AI, protected by design.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/onboarding">
                  <Button size="lg">
                    <Sparkles className="w-5 h-5" />
                    Try for free
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg">
                    Learn more
                  </Button>
                </a>
              </div>
            </div>
            <div className="relative hidden md:flex justify-center">
              {/* Hero illustration — card mockup */}
              <div className="relative w-80">
                <div className="absolute -top-4 -left-8 w-24 h-24 rounded-full bg-[var(--color-primary)] opacity-20 blur-2xl" />
                <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-[var(--color-accent)] opacity-20 blur-2xl" />
                <div className="bg-white rounded-3xl shadow-xl border border-[var(--color-border)] p-6 transform rotate-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-xl">
                      😊
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Your Emotional Twin</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Updated just now</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">Mood Stability</span>
                      <span className="font-semibold">82%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: "82%" }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">Social Energy</span>
                      <span className="font-semibold">67%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-blue-400" style={{ width: "67%" }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {["Reflective", "Creative", "Calm"].map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-amber-800 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-3xl shadow-xl border border-[var(--color-border)] p-4 mt-4 transform -rotate-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">New Match: Alex T.</div>
                      <div className="text-xs text-[var(--color-text-muted)]">87% compatible</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category pills — Headspace style */}
      <section className="py-16 bg-[var(--color-surface-soft)]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-center text-xl font-bold mb-8">
            What kind of connection are you looking for?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href="/onboarding"
                className="flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-[var(--color-border)] card-hover"
              >
                <span className="text-sm font-medium">{cat.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xl">{cat.emoji}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features — "The emotionally aware platform" */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold">
              The emotionally aware platform{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)]">
                for every student
              </span>
            </h2>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {["Digital Twins", "AI Matching", "Emotional Resonance", "Privacy First", "Peer Discovery"].map(
                (pill) => (
                  <span
                    key={pill}
                    className="text-sm px-4 py-2 rounded-full border border-[var(--color-border)] bg-white font-medium"
                  >
                    {pill}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 stagger">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group bg-white rounded-2xl border border-[var(--color-border)] p-8 card-hover"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16">
            How NeuroKin works
          </h2>
          <div className="space-y-12 stagger">
            {howItWorks.map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / testimonials — Headspace style */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
            Students are connecting in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)]">
              deeper ways
            </span>
          </h2>
          <p className="text-center text-[var(--color-text-muted)] mb-12 max-w-2xl mx-auto">
            Built on emotional resonance, not just shared classes.
          </p>
          <div className="grid md:grid-cols-3 gap-6 stagger">
            {[
              {
                quote:
                  "I finally found someone who gets how I feel about school pressure. We journal together now.",
                label: "On finding an emotionally compatible peer",
              },
              {
                quote:
                  "The icebreakers actually made sense — it wasn't awkward at all starting a conversation.",
                label: "On AI-generated icebreakers",
              },
              {
                quote:
                  "Knowing my journals are private but still help me connect makes me feel safe.",
                label: "On privacy-first design",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[var(--color-border)] p-6 card-hover flex flex-col justify-between"
              >
                <p className="text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety section */}
      <section id="safety" className="py-20 bg-[var(--color-surface-soft)]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Shield className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-3xl font-extrabold mb-4">
            Designed by experts, delivered with care
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
            NeuroKin is built with FERPA & COPPA compliance in mind. Raw
            journals are encrypted and never shared. You can opt out, block, or
            report at any time. School-level moderation tools ensure safety.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Encrypted journals",
              "No raw data shared",
              "Opt-out anytime",
              "Block & report",
              "FERPA ready",
            ].map((item) => (
              <span
                key={item}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-white border border-[var(--color-border)] font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Ready to find your people?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            Start journaling, build your Emotional Twin, and discover
            connections that actually matter.
          </p>
          <Link href="/onboarding">
            <Button
              variant="outline"
              size="xl"
              className="border-white text-white hover:bg-white hover:text-[var(--color-primary)]"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">NeuroKin</span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            &copy; 2026 NeuroKin. Emotionally intelligent student connections.
          </p>
        </div>
      </footer>
    </div>
  );
}
