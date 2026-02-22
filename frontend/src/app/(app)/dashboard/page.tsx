"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TagList } from "@/components/ui/TagList";
import Link from "next/link";
import {
  BookHeart,
  SmilePlus,
  Users,
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getTwin, getRecommendations } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/hooks/useFetch";

const moodHistory = [
  { day: "Mon", label: "😊", value: 80 },
  { day: "Tue", label: "😌", value: 70 },
  { day: "Wed", label: "😔", value: 40 },
  { day: "Thu", label: "🤔", value: 60 },
  { day: "Fri", label: "😊", value: 85 },
  { day: "Sat", label: "😌", value: 75 },
  { day: "Sun", label: "✨", value: 90 },
];

const getThumbUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

export default function DashboardPage() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? "";
  const { data: twin, loading: twinLoading } = useFetch(() => getTwin(studentId));
  const { data: recommendations, loading: recommendationsLoading } = useFetch(() => getRecommendations(studentId));

  const recentMatches = (recommendations ?? []).slice(0, 3);

  if (twinLoading) return <LoadingSpinner />;

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
              <ProgressBar
                label="Mood Stability"
                value={twin?.mood_stability ?? 0}
                gradient="bg-gradient-to-r from-emerald-400 to-emerald-500"
              />
              <ProgressBar
                label="Social Energy"
                value={twin?.social_energy ?? 0}
                gradient="bg-gradient-to-r from-blue-400 to-blue-500"
              />
            </div>
            <TagList tags={twin?.top_themes ?? []} className="mt-6" />
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
          {recommendationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-14 bg-slate-200 rounded-full" />
                      <div className="h-5 w-16 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="h-6 w-10 bg-slate-200 rounded ml-auto" />
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match) => (
              <div
                key={match.peer_id}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <img
                  src={getThumbUrl(match.display_name)}
                  alt={match.display_name}
                  className="w-11 h-11 rounded-full border border-[var(--color-border)] bg-white"
                />
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
              {recentMatches.length === 0 && (
                <div className="text-sm text-[var(--color-text-muted)] py-2">No matches yet.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
