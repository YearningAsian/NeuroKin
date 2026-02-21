"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  MessageCircle,
  Heart,
  Shield,
  Flag,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  name: string;
  score: number;
  explanation: string;
  shared_themes: string[];
  icebreaker: string;
  avatar_color: string;
}

const mockMatches: Match[] = [
  {
    id: "1",
    name: "Alex T.",
    score: 87,
    explanation:
      "You both express reflective journaling styles and show high interest in creative activities. Your emotional patterns suggest similar coping mechanisms.",
    shared_themes: ["Reflection", "Creativity", "Growth"],
    icebreaker:
      "You both gravitate toward creative expression — have you tried any new art forms lately?",
    avatar_color: "from-blue-400 to-indigo-500",
  },
  {
    id: "2",
    name: "Jordan M.",
    score: 74,
    explanation:
      "Both of you value empathy and show steady mood patterns. You share a preference for meaningful one-on-one conversations over large groups.",
    shared_themes: ["Empathy", "Calm", "Deep Conversations"],
    icebreaker:
      "You both seem like great listeners — what's a topic you could talk about for hours?",
    avatar_color: "from-emerald-400 to-teal-500",
  },
  {
    id: "3",
    name: "Sam R.",
    score: 68,
    explanation:
      "You share musical interests and similar social energy levels. Your journal entries suggest you both find comfort in routine and rhythm.",
    shared_themes: ["Music", "Routine", "Calmness"],
    icebreaker:
      "Music seems important to both of you — what's been on repeat this week?",
    avatar_color: "from-purple-400 to-pink-500",
  },
  {
    id: "4",
    name: "Riley K.",
    score: 62,
    explanation:
      "You share a strong curiosity drive and preference for growth-oriented activities. Your stress response patterns are compatible.",
    shared_themes: ["Curiosity", "Growth", "Resilience"],
    icebreaker:
      "You're both curious minds — learned anything surprising recently?",
    avatar_color: "from-amber-400 to-orange-500",
  },
  {
    id: "5",
    name: "Casey W.",
    score: 55,
    explanation:
      "You both show interest in volunteering and have similar social battery patterns. Your emotional tone in journals aligns on themes of kindness.",
    shared_themes: ["Kindness", "Community", "Social Impact"],
    icebreaker:
      "Helping others seems to matter to both of you — got any volunteer stories?",
    avatar_color: "from-rose-400 to-red-500",
  },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 65
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <div className={cn("px-3 py-1 rounded-full border text-sm font-bold", color)}>
      {score}%
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const [accepted, setAccepted] = useState<boolean | null>(null);

  if (accepted === false) return null;

  return (
    <Card className={cn("card-hover transition-all", accepted && "border-emerald-200 bg-emerald-50/50")}>
      <CardContent className="py-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg flex-shrink-0",
              match.avatar_color
            )}
          >
            {match.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-bold">{match.name}</h3>
              <ScoreBadge score={match.score} />
              {accepted && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {match.shared_themes.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[var(--color-text-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
            )}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4 animate-fade-in-up">
            {/* Explanation */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Why you match
              </h4>
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                {match.explanation}
              </p>
            </div>

            {/* Compatibility bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--color-text-muted)]">Emotional Compatibility</span>
                <span className="font-semibold">{match.score}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)] transition-all"
                  style={{ width: `${match.score}%` }}
                />
              </div>
            </div>

            {/* Icebreaker */}
            <div className="bg-[var(--color-primary-light)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-semibold text-amber-800">Suggested Icebreaker</span>
              </div>
              <p className="text-sm text-amber-900 italic">
                &ldquo;{match.icebreaker}&rdquo;
              </p>
            </div>

            {/* Actions */}
            {accepted === null && (
              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => setAccepted(true)}
                  className="flex-1"
                >
                  <Heart className="w-4 h-4" />
                  Connect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAccepted(false)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4" />
                  Skip
                </Button>
                <Button variant="ghost" size="sm" className="text-[var(--color-text-muted)]">
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConnectionsPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          <Users className="w-8 h-8 text-[var(--color-accent)]" />
          Your Connections
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Peers matched above 50% emotional compatibility. Only shared themes are shown — never raw journals.
        </p>
      </div>

      {/* Safety notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up">
        <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Your privacy is protected</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            No raw journal content is shared. Matches are based on emotional patterns and themes only. You can skip, block, or report at any time.
          </p>
        </div>
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-[var(--color-accent)]">{mockMatches.length}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Matches Found</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-emerald-600">
              {Math.round(mockMatches.reduce((a, b) => a + b.score, 0) / mockMatches.length)}%
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Avg Compatibility</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {mockMatches.filter((m) => m.score >= 75).length}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Strong Matches</div>
          </CardContent>
        </Card>
      </div>

      {/* Match list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
            Recommended Peers
          </h2>
        </div>
        <div className="space-y-3 stagger">
          {mockMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
