"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  BookHeart,
  SmilePlus,
  Users,
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getTwin, getRecommendations, type TwinSnapshot, type PeerRecommendation } from "@/lib/api";
import { DEMO_STUDENT_ID } from "@/lib/user";

const moodHistory = [
  { day: "Mon", label: "😊", value: 80 },
  { day: "Tue", label: "😌", value: 70 },
  { day: "Wed", label: "😔", value: 40 },
  { day: "Thu", label: "🤔", value: 60 },
  { day: "Fri", label: "😊", value: 85 },
  { day: "Sat", label: "😌", value: 75 },
  { day: "Sun", label: "✨", value: 90 },
];

export default function DashboardPage() {
  const [twin, setTwin] = useState<TwinSnapshot | null>(null);
  const [recentMatches, setRecentMatches] = useState<PeerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, r] = await Promise.all([
          getTwin(DEMO_STUDENT_ID),
          getRecommendations(DEMO_STUDENT_ID),
        ]);
        setTwin(t);
        setRecentMatches(r.slice(0, 3));
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-extrabold">
          Good afternoon! <span className="text-3xl">👋</span>
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Your Emotional Twin is active. Here&apos;s your overview.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        <Link href="/journal">
          <Card className="card-hover cursor-pointer bg-amber-50 border-amber-200">
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <BookHeart className="w-7 h-7 text-amber-600" />
              <span className="text-sm font-semibold">Journal</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mood">
          <Card className="card-hover cursor-pointer bg-emerald-50 border-emerald-200">
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <SmilePlus className="w-7 h-7 text-emerald-600" />
              <span className="text-sm font-semibold">Mood Check-in</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/connections">
          <Card className="card-hover cursor-pointer bg-blue-50 border-blue-200">
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <Users className="w-7 h-7 text-blue-600" />
              <span className="text-sm font-semibold">Connections</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/profile">
          <Card className="card-hover cursor-pointer bg-purple-50 border-purple-200">
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <Brain className="w-7 h-7 text-purple-600" />
              <span className="text-sm font-semibold">My Twin</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Twin snapshot card */}
        <Card className="md:col-span-2 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--color-primary)]" />
              Your Emotional Twin
            </CardTitle>
            <CardDescription>A snapshot of who you are right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--color-text-muted)]">Mood Stability</span>
                  <span className="font-semibold">{Math.round((twin?.mood_stability ?? 0) * 100)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                    style={{ width: `${(twin?.mood_stability ?? 0) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--color-text-muted)]">Social Energy</span>
                  <span className="font-semibold">{Math.round(twin?.social_energy ?? 0)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all"
                    style={{ width: `${twin?.social_energy ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {(twin?.top_themes ?? []).map((t) => (
                <span
                  key={t}
                  className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-primary-light)] text-amber-800 font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-1.5">
                <BookHeart className="w-4 h-4" /> {twin?.top_themes.length ?? 0} themes
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {recentMatches.length} connections
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current mood */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>Current Mood</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-6xl mb-3 pulse-soft">😌</div>
            <div className="text-lg font-semibold">{twin?.display_name ?? "You"}</div>
            <Link href="/mood" className="mt-4">
              <Button variant="secondary" size="sm">
                Update mood <SmilePlus className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Mood week chart */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
            Mood This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-40">
            {moodHistory.map((m) => (
              <div key={m.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-lg">{m.label}</span>
                <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: "100px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-[var(--color-accent)] to-blue-300 transition-all"
                    style={{ height: `${m.value}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">{m.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent matches */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                Recent Matches
              </CardTitle>
              <CardDescription>Peers above 50% emotional compatibility</CardDescription>
            </div>
            <Link href="/connections">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <div
                key={match.peer_id}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center text-white font-bold text-sm">
                  {match.display_name[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{match.display_name}</div>
                  <div className="flex gap-1.5 mt-1">
                    {match.shared_themes.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 rounded-full bg-white border border-[var(--color-border)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[var(--color-accent)]">
                    {Math.round(match.compatibility_score)}%
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">compatible</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
