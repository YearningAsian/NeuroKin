"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TagList } from "@/components/ui/TagList";
import { Toast } from "@/components/ui/Toast";
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
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { getTwin, deleteAccount, submitConsent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/hooks/useFetch";

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

const twinAvatarOptions = ["Nova", "Atlas", "Echo", "Luna", "Sage", "Aster"];

const getThumbUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const studentId = user?.studentId ?? "";
  const { data: twin, loading } = useFetch(() => getTwin(studentId));
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [consentGranted, setConsentGranted] = useState(true);
  const [twinName, setTwinName] = useState("My Twin");
  const [twinSeed, setTwinSeed] = useState("Nova");
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    const savedTwinName = window.localStorage.getItem(`neurotwin_twin_name_${studentId}`);
    const savedTwinSeed = window.localStorage.getItem(`neurotwin_twin_seed_${studentId}`);
    if (savedTwinName) {
      setTwinName(savedTwinName);
    }
    if (savedTwinSeed) {
      setTwinSeed(savedTwinSeed);
    } else if (user?.displayName) {
      setTwinSeed(user.displayName);
    }
  }, [studentId, user?.displayName]);

  const handleTwinNameChange = (value: string) => {
    setTwinName(value);
    if (studentId) {
      window.localStorage.setItem(`neurotwin_twin_name_${studentId}`, value);
    }
  };

  const handleTwinSeedChange = (value: string) => {
    setTwinSeed(value);
    if (studentId) {
      window.localStorage.setItem(`neurotwin_twin_seed_${studentId}`, value);
    }
  };

  const handleExportData = () => {
    if (!twin) return;
    const exportData = {
      student_id: twin.student_id,
      display_name: twin.display_name,
      emotion_distribution: twin.emotion_distribution,
      top_themes: twin.top_themes,
      activity_preferences: twin.activity_preferences,
      mood_stability: twin.mood_stability,
      social_energy: twin.social_energy,
      shared_values_tags: twin.shared_values_tags,
      last_updated: twin.last_updated,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neurotwin-twin-${twin.student_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Twin data exported successfully!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount(studentId);
      setShowDeleteConfirm(false);
      setToastMessage("Account deleted. All data has been removed.");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        logout();
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      console.error("Delete failed:", err);
      setToastMessage("Failed to delete account. Please try again.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setDeleting(false);
    }
  };

  const handleConsentToggle = async () => {
    const newConsent = !consentGranted;
    try {
      await submitConsent(studentId, newConsent);
      setConsentGranted(newConsent);
      setToastMessage(newConsent ? "Data processing re-enabled." : "Data processing paused.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Consent update failed:", err);
    }
  };

  if (loading) return <LoadingSpinner color="text-purple-500" />;

  if (!twin) {
    return (
      <EmptyState
        icon={Brain}
        title="No Twin Yet"
        description="Submit a journal entry or mood check-in to build your Emotional Twin."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Brain}
        iconColor="text-purple-500"
        title="Your Emotional Twin"
        description={`A dynamic, AI-built representation of your emotional landscape. Updated ${new Date(twin.last_updated).toLocaleDateString()}.`}
      />

      {/* Twin overview card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 animate-fade-in-up">
        <CardContent className="py-8">
          <div className="flex items-center gap-6 mb-8">
            <img
              src={getThumbUrl(twinSeed || twin.display_name)}
              alt={twinName}
              className="w-20 h-20 rounded-full border-2 border-white bg-white shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-extrabold">{twinName || "My Twin"}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {twin.top_themes.length} themes · {twin.activity_preferences.length} activities
              </p>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => setShowCustomize((v) => !v)}>
                <Settings className="w-4 h-4" /> Rename & Avatar
              </Button>
            </div>
          </div>

          {showCustomize && (
            <div className="mb-6 p-4 bg-white/70 rounded-xl border border-[var(--color-border)] space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Twin Name
                </label>
                <input
                  value={twinName}
                  onChange={(e) => handleTwinNameChange(e.target.value)}
                  placeholder="My Twin"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Thumb Avatar
                </p>
                <div className="flex flex-wrap gap-2">
                  {twinAvatarOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleTwinSeedChange(option)}
                      className={`p-1.5 rounded-full border transition-colors ${
                        twinSeed === option
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                          : "border-[var(--color-border)] bg-white"
                      }`}
                    >
                      <img
                        src={getThumbUrl(option)}
                        alt={option}
                        className="w-10 h-10 rounded-full"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-xl p-4 text-center">
              <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{Math.round(twin.mood_stability)}%</div>
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
              <TagList
                tags={twin.top_themes}
                tagClassName="bg-[var(--color-primary-light)] text-amber-800 text-sm px-4 py-2"
              />
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle>Activity Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <TagList
                tags={twin.activity_preferences}
                tagClassName="bg-blue-50 text-blue-700 border border-blue-200 text-sm px-4 py-2"
              />
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle>Core Values</CardTitle>
            </CardHeader>
            <CardContent>
              <TagList
                tags={twin.shared_values_tags ?? []}
                tagClassName="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm px-4 py-2"
              />
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
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="w-4 h-4" /> Export My Data
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPrivacy(!showPrivacy)}>
              <Settings className="w-4 h-4" /> Privacy Settings
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4" /> Delete My Twin
            </Button>
          </div>

          {/* Privacy settings panel */}
          {showPrivacy && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-[var(--color-border)] animate-fade-in-up">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[var(--color-text-muted)]" />
                Privacy Controls
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Allow data processing</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      When off, your twin won&apos;t update and you won&apos;t appear in matches.
                    </p>
                  </div>
                  <button
                    onClick={handleConsentToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      consentGranted ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        consentGranted ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Journals are encrypted at rest using Fernet symmetric encryption. Raw text is never shared with other students.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Matching uses only aggregated emotional patterns and theme tags — never raw content.</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Delete your account?</h3>
                <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              This will permanently delete all your data: journal entries, mood check-ins,
              your Emotional Twin, matches, and any reports. You will be redirected to the home page.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Deleting..." : "Delete Everything"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      <Toast
        message={toastMessage}
        visible={showToast}
        onDismiss={() => setShowToast(false)}
      />
    </div>
  );
}
