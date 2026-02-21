"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Brain,
  TrendingUp,
  Activity,
  Zap,
  Tag,
  Users,
  Shield,
  Settings,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { getTwin, type TwinSnapshot } from "@/lib/api";
import { DEMO_STUDENT_ID } from "@/lib/user";

const emotionColors: Record<string, string> = {
  joy: "bg-amber-400",
  calm: "bg-emerald-400",
  curiosity: "bg-blue-400",
  anxiety: "bg-purple-400",
  sadness: "bg-indigo-400",
  frustration: "bg-red-400",
  determination: "bg-orange-400",
  empathy: "bg-pink-400",
  hope: "bg-cyan-400",
  excitement: "bg-rose-400",
  nostalgia: "bg-violet-400",
  reflection: "bg-teal-400",
  gratitude: "bg-lime-400",
};

export default function ProfilePage() {
  const [twin, setTwin] = useState<TwinSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await getTwin(DEMO_STUDENT_ID);
        setTwin(t);
      } catch (err) {
        console.error("Failed to load twin:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="text-center py-16">
        <Brain className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">No Twin Yet</h2>
        <p className="text-[var(--color-text-muted)]">Submit a journal entry or mood check-in to build your Emotional Twin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-500" />
          Your Emotional Twin
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          A dynamic, AI-built representation of your emotional landscape. Updated{" "}
          <span className="font-medium">{new Date(twin.last_updated).toLocaleDateString()}</span>.
        </p>
      </div>

      {/* Twin overview card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 animate-fade-in-up">
        <CardContent className="py-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-3xl text-white font-bold shadow-lg">
              {twin.display_name[0]}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">{twin.display_name}&apos;s Twin</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {twin.top_themes.length} themes · {twin.activity_preferences.length} activities
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-xl p-4 text-center">
              <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{Math.round(twin.mood_stability * 100)}%</div>
              <div className="text-xs text-[var(--color-text-muted)]">Mood Stability</div>
            </div>
            <div className="bg-white/80 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{Math.round(twin.social_energy)}%</div>
              <div className="text-xs text-[var(--color-text-muted)]">Social Energy</div>
            </div>
            <div className="bg-white/80 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-[var(--color-primary)] mx-auto mb-2" />
              <div className="text-2xl font-bold">{twin.top_themes.length}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Themes</div>
            </div>
            <div className="bg-white/80 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{twin.activity_preferences.length}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Activities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Emotion distribution */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>Emotion Distribution</CardTitle>
            <CardDescription>How your emotions are distributed across journal entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(twin.emotion_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, value]) => (
                  <div key={emotion}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{emotion}</span>
                      <span className="text-[var(--color-text-muted)]">
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100">
                      <div
                        className={`h-3 rounded-full ${emotionColors[emotion] || "bg-slate-400"} transition-all`}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top themes & activities */}
        <div className="space-y-6">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[var(--color-primary)]" />
                Core Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {twin.top_themes.map((t) => (
                  <span
                    key={t}
                    className="text-sm px-4 py-2 rounded-full bg-[var(--color-primary-light)] text-amber-800 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle>Activity Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {twin.activity_preferences.map((a) => (
                  <span
                    key={a}
                    className="text-sm px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle>Core Values</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(twin.shared_values_tags ?? []).map((v) => (
                  <span
                    key={v}
                    className="text-sm px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Privacy & settings */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Your data belongs to you. All journal content is encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" /> Export My Data
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" /> Privacy Settings
            </Button>
            <Button variant="danger" size="sm">
              <Trash2 className="w-4 h-4" /> Delete My Twin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
