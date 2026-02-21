"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Brain,
  Heart,
  Shield,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Activity,
  Star,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from "react";

/* ─────────────────────── DATA ─────────────────────── */

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/thumbs/svg";
const heroSeed = "neurotwin-hero";

const twinFactors = [
  {
    label: "Emotional Patterns",
    description: "How you feel day-to-day",
    icon: Heart,
    color: "#f43f5e",
    angle: -90,
  },
  {
    label: "Journal Reflections",
    description: "Your personal thoughts",
    icon: BookOpen,
    color: "#f59e0b",
    angle: -18,
  },
  {
    label: "Daily Activities",
    description: "What you spend time on",
    icon: Activity,
    color: "#3b82f6",
    angle: 54,
  },
  {
    label: "Core Values",
    description: "What matters most to you",
    icon: Star,
    color: "#8b5cf6",
    angle: 126,
  },
  {
    label: "Social Energy",
    description: "How you connect with others",
    icon: Users,
    color: "#10b981",
    angle: 198,
  },
];

const features = [
  {
    icon: Brain,
    title: "Emotional Digital Twin",
    description:
      "We build a dynamic emotional profile from your journals, moods, and activities — your evolving digital twin that grows with you.",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50",
  },
  {
    icon: Heart,
    title: "Deep Compatibility",
    description:
      "Matching goes beyond shared classes. We measure emotional resonance, coping styles, and social energy for real connections.",
    color: "from-rose-400 to-pink-500",
    bg: "bg-rose-50",
  },
  {
    icon: Users,
    title: "Meaningful Connections",
    description:
      "Get paired with peers who truly get you. Only connections above 50% compatibility are shown — quality over quantity.",
    color: "from-blue-400 to-indigo-500",
    bg: "bg-blue-50",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your raw journals are never shared. We use encrypted, privacy-preserving AI to keep your data safe at every step.",
    color: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Journal & Check In",
    description:
      "Write about your day, check in your mood, or log activities. It only takes a minute.",
    icon: BookOpen,
    seed: "step-journal",
  },
  {
    step: "02",
    title: "Your Twin Evolves",
    description:
      "AI builds your Emotional Digital Twin — a rich, nuanced understanding of who you are.",
    icon: Brain,
    seed: "step-twin",
  },
  {
    step: "03",
    title: "Find Your People",
    description:
      "NeuroTwin matches you with emotionally compatible peers and gives you a personalized icebreaker.",
    icon: Users,
    seed: "step-match",
  },
];

const testimonials = [
  {
    quote:
      "I finally found someone who gets how I feel about school pressure. We journal together now.",
    label: "On finding an emotionally compatible peer",
    seed: "sarah",
    name: "Sarah K.",
  },
  {
    quote:
      "The icebreakers actually made sense — it wasn't awkward at all starting a conversation.",
    label: "On AI-generated icebreakers",
    seed: "alex",
    name: "Alex T.",
  },
  {
    quote:
      "Knowing my journals are private but still help me connect makes me feel safe.",
    label: "On privacy-first design",
    seed: "maya",
    name: "Maya R.",
  },
  {
    quote:
      "I love how my twin evolves — it really captures who I'm becoming, not just who I was.",
    label: "On the evolving digital twin",
    seed: "jordan",
    name: "Jordan L.",
  },
  {
    quote:
      "Within a week I had three genuine connections. This beats every other social app.",
    label: "On meaningful peer matching",
    seed: "riley",
    name: "Riley P.",
  },
];

/* ─────────────────── HELPER COMPONENTS ─────────────────── */

function FadeInWhenVisible({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const dirMap = {
    up: { y: 60, x: 0 },
    down: { y: -60, x: 0 },
    left: { x: 60, y: 0 },
    right: { x: -60, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...dirMap[direction] }}
      animate={
        isInView
          ? { opacity: 1, y: 0, x: 0 }
          : { opacity: 0, ...dirMap[direction] }
      }
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Thought Cloud (floating factor bubble) ── */
function ThoughtCloud({
  factor,
  index,
  radius,
}: {
  factor: (typeof twinFactors)[0];
  index: number;
  radius: number;
}) {
  const Icon = factor.icon;
  const rad = (factor.angle * Math.PI) / 180;
  const cx = Math.cos(rad) * radius;
  const cy = Math.sin(rad) * radius;

  // Determine which side the cloud is relative to center for tail placement
  const isRight = cx > 0;

  return (
    <motion.div
      className="absolute z-20 pointer-events-auto"
      style={{
        left: `calc(50% + ${cx}px)`,
        top: `calc(50% + ${cy}px)`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: 0.9 + index * 0.15,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {/* The cloud bubble */}
      <motion.div
        className="relative bg-white rounded-[24px] px-4 py-3 min-w-[150px] md:min-w-[170px] cursor-default select-none"
        style={{
          boxShadow: `0 8px 30px ${factor.color}18, 0 2px 10px rgba(0,0,0,0.06)`,
          border: `1.5px solid ${factor.color}20`,
        }}
        whileHover={{ scale: 1.08, y: -4 }}
        animate={{ y: [0, -7, 0] }}
        transition={{
          y: {
            duration: 3.5 + index * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        {/* Cloud tail dots — pointing inward toward the center thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white"
          style={{
            border: `1.5px solid ${factor.color}20`,
            bottom: cy > 0 ? "auto" : -10,
            top: cy > 0 ? -10 : "auto",
            left: isRight ? 24 : "auto",
            right: !isRight ? 24 : "auto",
            boxShadow: `0 2px 6px ${factor.color}12`,
          }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-white"
          style={{
            border: `1.5px solid ${factor.color}20`,
            bottom: cy > 0 ? "auto" : -18,
            top: cy > 0 ? -18 : "auto",
            left: isRight ? 18 : "auto",
            right: !isRight ? 18 : "auto",
            boxShadow: `0 1px 4px ${factor.color}10`,
          }}
        />

        {/* Content */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${factor.color}14` }}
          >
            <Icon className="w-4 h-4" style={{ color: factor.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-800 leading-tight">
              {factor.label}
            </div>
            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
              {factor.description}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Dashed connector lines from clouds to center ── */
function ConnectorLines({ radius }: { radius: number }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
      viewBox="0 0 700 700"
    >
      {twinFactors.map((f, i) => {
        const rad = (f.angle * Math.PI) / 180;
        const innerRadius = 110;
        const outerRadius = Math.max(radius - 40, innerRadius + 35);
        const outerX = 350 + Math.cos(rad) * outerRadius;
        const outerY = 350 + Math.sin(rad) * outerRadius;
        const innerX = 350 + Math.cos(rad) * innerRadius;
        const innerY = 350 + Math.sin(rad) * innerRadius;

        return (
          <motion.line
            key={i}
            x1={innerX}
            y1={innerY}
            x2={outerX}
            y2={outerY}
            stroke={f.color}
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeLinecap="round"
            opacity="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 1, delay: 1.2 + i * 0.12 }}
          />
        );
      })}
    </svg>
  );
}

/* ── Testimonial Carousel ── */
function Carousel() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((d: number) => {
    setDir(d);
    setCurrent((p) => (p + d + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    timer.current = setInterval(() => go(1), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [go]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 280 : -280, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -280 : 280, opacity: 0 }),
  };

  const t = testimonials[current];

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-xl min-h-[260px] flex items-center px-8 py-10 md:px-14">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={current}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            className="flex flex-col items-center text-center gap-5 w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${DICEBEAR_BASE}?seed=${t.seed}&backgroundColor=f1f5f9&radius=50`}
              alt={t.name}
              className="w-16 h-16 rounded-full border-2 border-slate-100"
            />
            <p className="text-lg md:text-xl leading-relaxed text-slate-700 font-medium">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <div className="font-semibold text-slate-800">{t.name}</div>
              <div className="text-sm text-slate-400">{t.label}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => go(-1)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => {
                setDir(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "bg-[var(--color-primary)] w-7"
                  : "bg-slate-200 hover:bg-slate-300 w-2.5"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────── PARALLAX HOOK ─────────────── */
function useParallax(
  ref: RefObject<HTMLElement | null>,
  distance: number
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return useTransform(scrollYProgress, [0, 1], [-distance, distance]);
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const heroY = useParallax(heroRef, 50);
  const entryTimeoutRef = useRef<number | null>(null);
  const [journalEntry, setJournalEntry] = useState("");
  const [journalStatus, setJournalStatus] = useState<string | null>(null);

  const handleJournalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = journalEntry.trim();
    if (!trimmed) {
      setJournalStatus("Share a quick thought before logging.");
      return;
    }
    setJournalStatus("Entry logged. Your twin is listening.");
    setJournalEntry("");
    console.log("Journal entry:", trimmed);
    if (entryTimeoutRef.current) {
      clearTimeout(entryTimeoutRef.current);
    }
    entryTimeoutRef.current = window.setTimeout(() => {
      setJournalStatus(null);
    }, 3200);
  };

  /* Responsive radius for the thought cloud orbit */
  const [cloudRadius, setCloudRadius] = useState(230);
  useEffect(() => {
    const update = () => setCloudRadius(window.innerWidth < 768 ? 150 : 230);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    return () => {
      if (entryTimeoutRef.current) {
        clearTimeout(entryTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ──── HEADER ──── */}
      <motion.header
        className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/60"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Neuro<span className="text-[var(--color-primary)]">Twin</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-slate-900 transition-colors">Stories</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO: Digital Twin Visualization ═══════════════ */}
      <section
        ref={heroRef}
        className="relative pt-28 pb-8 md:pt-36 md:pb-16 overflow-hidden"
      >
        {/* Background glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-200/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-200/25 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-100/20 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Hero text */}
          <motion.div
            className="text-center mb-6 md:mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-full px-4 py-1.5 text-sm font-medium text-amber-700 mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4" />
              AI-powered emotional connections
            </motion.div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto">
              Your emotional{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] via-orange-400 to-[var(--color-warm)] animate-gradient">
                digital twin
              </span>
              <br />
              finds your people
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              NeuroTwin builds a living model of your emotional self — then
              matches you with peers who truly understand you.
            </p>
          </motion.div>

          {/* ── TWIN VISUALIZATION ── */}
          <motion.div
            style={{ y: heroY }}
            className="relative w-full max-w-[700px] mx-auto"
            /* Fixed aspect ratio container */
          >
            <div className="relative w-full" style={{ paddingBottom: "100%" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Center glow pulse */}
                <motion.div
                  className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(249,168,37,0.18) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Orbit ring */}
                <motion.div
                  className="absolute rounded-full border-2 border-dashed border-slate-200/40"
                  style={{
                    width: cloudRadius * 2 + 60,
                    height: cloudRadius * 2 + 60,
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 80,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Dashed connector lines */}
                <ConnectorLines radius={cloudRadius} />

                {/* Center DiceBear Thumb Avatar */}
                <motion.div
                  className="relative z-10"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                >
                  <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] p-1 shadow-2xl">
                    <div className="w-full h-full rounded-full bg-white p-2 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${DICEBEAR_BASE}?seed=${heroSeed}&backgroundColor=fef3c7&scale=90`}
                        alt="Your Digital Twin"
                        className="w-full h-full rounded-full"
                      />
                    </div>
                  </div>
                  {/* Label pill */}
                  <motion.div
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-1.5 shadow-lg border border-slate-100 whitespace-nowrap"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6, duration: 0.5 }}
                  >
                    <span className="text-xs font-bold text-slate-600 tracking-wide">
                      Your Digital Twin
                    </span>
                  </motion.div>
                </motion.div>

                {/* Floating thought cloud factors */}
                {twinFactors.map((factor, i) => (
                  <ThoughtCloud
                    key={factor.label}
                    factor={factor}
                    index={i}
                    radius={cloudRadius}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="flex flex-wrap justify-center gap-4 mt-6 md:mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.6 }}
          >
            <Link href="/onboarding">
              <Button size="lg">
                <Sparkles className="w-5 h-5" />
                Build Your Twin
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg">
                See how it works
              </Button>
            </a>
          </motion.div>
          <motion.form
            onSubmit={handleJournalSubmit}
            className="max-w-4xl mx-auto mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.6 }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start bg-white/90 border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
                  Sync a thought
                </p>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">
                  Ask your twin a question or log a quick entry.
                </h3>
                <textarea
                  value={journalEntry}
                  onChange={(event) => setJournalEntry(event.target.value)}
                  placeholder="What do I need today? Ask your digital twin anything."
                  className="w-full min-h-[120px] resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm"
                  rows={3}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Entries stay private and help the twin reflect who you are.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:w-36 md:items-end">
                <Button type="submit" size="md" className="w-full">
                  Log entry
                </Button>
                <Link href="/journal">
                  <Button variant="outline" size="md" className="w-full">
                    Open journal
                  </Button>
                </Link>
                {journalStatus && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1 text-center md:text-right">
                    {journalStatus}
                  </p>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      </section>

      {/* ── Scroll indicator ── */}
      <motion.div
        className="flex justify-center pb-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-300 flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-slate-400"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="py-20 md:py-32 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4">
          <FadeInWhenVisible>
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
                Features
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold mt-3 tracking-tight">
                The emotionally aware platform
              </h2>
              <p className="text-slate-500 mt-4 max-w-xl mx-auto text-lg">
                Powered by AI that understands the nuances of human emotion —
                not just keywords.
              </p>
            </div>
          </FadeInWhenVisible>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeInWhenVisible
                  key={f.title}
                  delay={i * 0.1}
                  direction={i % 2 === 0 ? "left" : "right"}
                >
                  <motion.div
                    className={`${f.bg} rounded-3xl p-8 md:p-10 border border-white/60 h-full`}
                    whileHover={{
                      y: -6,
                      boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                    <p className="text-slate-500 leading-relaxed">
                      {f.description}
                    </p>
                  </motion.div>
                </FadeInWhenVisible>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-4">
          <FadeInWhenVisible>
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">
                How it works
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold mt-3 tracking-tight">
                Three simple steps
              </h2>
            </div>
          </FadeInWhenVisible>

          <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {howItWorks.map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeInWhenVisible key={item.step} delay={i * 0.15}>
                  <motion.div
                    className="relative bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm h-full"
                    whileHover={{ y: -6 }}
                  >
                    {/* Step watermark */}
                    <div className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none">
                      {item.step}
                    </div>

                    {/* DiceBear avatar */}
                    <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 mb-5 overflow-hidden border-2 border-white shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${DICEBEAR_BASE}?seed=${item.seed}&backgroundColor=e2e8f0&scale=85`}
                        alt={item.title}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Arrow between cards */}
                    {i < howItWorks.length - 1 && (
                      <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-10">
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </motion.div>
                </FadeInWhenVisible>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ MATCHING PREVIEW ═══════════════ */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <FadeInWhenVisible>
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-rose-500 uppercase tracking-wider">
                Matching
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold mt-3 tracking-tight">
                See who truly gets you
              </h2>
              <p className="text-slate-500 mt-4 max-w-xl mx-auto text-lg">
                Each match includes a compatibility score and a personalized
                icebreaker to get the conversation started.
              </p>
            </div>
          </FadeInWhenVisible>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Alex T.",
                seed: "alex-m",
                score: 87,
                traits: ["Reflective", "Creative"],
                icebreaker: "You both find peace in creative expression...",
              },
              {
                name: "Sam W.",
                seed: "sam-m",
                score: 82,
                traits: ["Empathetic", "Curious"],
                icebreaker:
                  "You share a deep appreciation for understanding others...",
              },
              {
                name: "Casey L.",
                seed: "casey-m",
                score: 75,
                traits: ["Adventurous", "Calm"],
                icebreaker: "You both balance excitement with groundedness...",
              },
            ].map((match, i) => (
              <FadeInWhenVisible key={match.name} delay={i * 0.12}>
                <motion.div
                  className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm"
                  whileHover={{
                    y: -8,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${DICEBEAR_BASE}?seed=${match.seed}&backgroundColor=dbeafe&radius=50&scale=85`}
                      alt={match.name}
                      className="w-14 h-14 rounded-full border-2 border-slate-100"
                    />
                    <div>
                      <div className="font-bold text-slate-800">
                        {match.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              match.score > 80 ? "#10b981" : "#f59e0b",
                          }}
                        />
                        <span className="font-semibold text-slate-600">
                          {match.score}% compatible
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {match.traits.map((tr) => (
                      <span
                        key={tr}
                        className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium"
                      >
                        {tr}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400 italic leading-relaxed">
                    &ldquo;{match.icebreaker}&rdquo;
                  </p>
                </motion.div>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS CAROUSEL ═══════════════ */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4">
          <FadeInWhenVisible>
            <div className="text-center mb-14">
              <span className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">
                Stories
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold mt-3 tracking-tight">
                Students are connecting{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)]">
                  in deeper ways
                </span>
              </h2>
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.2}>
            <Carousel />
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ═══════════════ SAFETY ═══════════════ */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FadeInWhenVisible>
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-6"
              whileHover={{ rotate: 10 }}
            >
              <Shield className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Designed with safety at the core
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
              NeuroTwin is built with FERPA & COPPA compliance in mind. Your raw
              journals are encrypted and never shared.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Encrypted journals",
                "No raw data shared",
                "Opt-out anytime",
                "Block & report",
                "FERPA ready",
              ].map((item, i) => (
                <FadeInWhenVisible key={item} delay={i * 0.08}>
                  <span className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-full bg-white border border-slate-200 font-medium shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {item}
                  </span>
                </FadeInWhenVisible>
              ))}
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-orange-400 to-[var(--color-warm)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <FadeInWhenVisible>
            <motion.div
              className="inline-block mb-8"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${DICEBEAR_BASE}?seed=cta-twin&backgroundColor=ffffff&radius=50&scale=90`}
                alt="Your Twin"
                className="w-24 h-24 rounded-full border-4 border-white/30 shadow-2xl"
              />
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">
              Ready to find your people?
            </h2>
            <p className="text-white/80 mb-10 max-w-lg mx-auto text-lg">
              Start journaling, build your Emotional Twin, and discover
              connections that actually matter.
            </p>
            <Link href="/onboarding">
              <Button
                variant="outline"
                size="xl"
                className="border-white/40 text-white hover:bg-white hover:text-[var(--color-primary)] shadow-lg backdrop-blur-sm"
              >
                Get started — it&apos;s free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">NeuroTwin</span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; 2026 NeuroTwin. Emotionally intelligent student connections.
          </p>
        </div>
      </footer>
    </div>
  );
}
