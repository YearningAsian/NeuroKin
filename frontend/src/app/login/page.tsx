"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Brain, Loader2, LogIn, AlertCircle } from "lucide-react";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { id: "demo-alex", name: "Alex", description: "Curious, creative, into AI & music" },
  { id: "demo-jordan", name: "Jordan", description: "Empathetic writer, yoga & mindfulness" },
  { id: "demo-sam", name: "Sam", description: "Energetic, entrepreneurial, sports & cooking" },
  { id: "demo-riley", name: "Riley", description: "Calm, scholarly, astronomy & meditation" },
  { id: "demo-casey", name: "Casey", description: "Determined techie, gaming & robotics" },
  { id: "demo-morgan", name: "Morgan", description: "Compassionate activist, dance & poetry" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (id?: string, pw?: string) => {
    const uid = id || studentId.trim();
    const pass = pw || password;
    if (!uid || !pass) {
      setError("Please enter your username and password.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await login(uid, pass);
      authLogin(result.student_id, result.display_name);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("401")) {
        setError("Invalid username or password.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = (accountId: string) => {
    handleLogin(accountId, "demo");
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-soft)] flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              Neuro<span className="text-[var(--color-primary)]">Kin</span>
            </span>
          </Link>
          <Link href="/onboarding">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-warm)] flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold">Welcome back</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Log in to your NeuroKin account
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
            {error && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Username</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. demo-alex"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => handleLogin()}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</>
                ) : (
                  "Log In"
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Don&apos;t have an account?{" "}
                <Link href="/onboarding" className="text-[var(--color-primary)] font-medium hover:underline">
                  Sign up free
                </Link>
              </p>
            </div>
          </div>

          {/* Demo accounts section */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">
                Demo Accounts
              </span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
            <p className="text-xs text-center text-[var(--color-text-muted)] mb-3">
              Click any account to log in instantly (password: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">demo</code>)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleDemoLogin(acc.id)}
                  disabled={submitting}
                  className="text-left p-3 rounded-xl border border-[var(--color-border)] bg-white hover:bg-slate-50 hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
                >
                  <div className="text-sm font-semibold">{acc.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">{acc.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
