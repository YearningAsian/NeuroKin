"use client";

import { useCallback } from "react";
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
  School,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getTwin, getRecommendations, getMoodHistory, type MoodHistoryEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/hooks/useFetch";

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

/** Convert mood label to a 0-100 "positivity" value for the bar chart */
function moodToValue(label: string): number {
  const map: Record<string, number> = {
    excited: 95,
    happy: 85,
    calm: 75,
    reflective: 60,
    tired: 45,
    sad: 35,
    frustrated: 30,
    anxious: 25,
  };
  return map[label] ?? 50;
}

const getThumbUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

export default function DashboardPage() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? "";
  const { data: twin, loading: twinLoading } = useFetch(() => getTwin(studentId));
  const { data: recommendations, loading: recommendationsLoading } = useFetch(() => getRecommendations(studentId));

  const moodFetcher = useCallback(() => getMoodHistory(studentId, 7), [studentId]);
  const { data: moodHistory, loading: moodLoading } = useFetch(moodFetcher);

  const recentMatches = (recommendations ?? []).slice(0, 3);

  // Derive current mood from the most recent mood history entry
  const latestMood = moodHistory && moodHistory.length > 0 ? moodHistory[0] : null;
  const currentMoodEmoji = latestMood ? (MOOD_EMOJI[latestMood.mood_label] ?? "📝") : "🫥";
  const currentMoodLabel = latestMood
    ? latestMood.mood_label.charAt(0).toUpperCase() + latestMood.mood_label.slice(1)
    : "No check-in yet";
  const communitySchool = user?.school || (studentId.startsWith("duke-") ? "Duke University" : "");

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
        {communitySchool && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white text-xs text-[var(--color-text-muted)]">
            <School className="w-3.5 h-3.5" />
            <span className="font-medium">Community:</span>
            <span>{communitySchool}</span>
          </div>
        )}
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
            <div className="text-6xl mb-3 pulse-soft">{currentMoodEmoji}</div>
            <div className="text-lg font-semibold">{currentMoodLabel}</div>
            <Link href="/journal" className="mt-4">
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
          {moodLoading ? (
            <div className="h-40 flex items-center justify-center text-sm text-[var(--color-text-muted)]">Loading mood data...</div>
          ) : !moodHistory || moodHistory.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-sm text-[var(--color-text-muted)]">
              <p>No mood check-ins yet.</p>
              <Link href="/journal" className="mt-2">
                <Button variant="secondary" size="sm">Check in now</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-40">
              {[...moodHistory].reverse().map((m: MoodHistoryEntry, i: number) => {
                const val = moodToValue(m.mood_label);
                const emoji = MOOD_EMOJI[m.mood_label] ?? "📝";
                const day = new Date(m.created_at).toLocaleDateString(undefined, { weekday: "short" });
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: "100px" }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-[var(--color-accent)] to-blue-300 transition-all"
                        style={{ height: `${val}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">{day}</span>
                  </div>
                );
              })}
            </div>
          )}
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
