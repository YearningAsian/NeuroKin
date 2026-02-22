"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { TagList } from "@/components/ui/TagList";
import {
  Users,
  MessageCircle,
  Heart,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  XCircle,
  MoreHorizontal,
  Trash2,
  Ban,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRecommendations,
  submitFeedback,
  blockUser,
  reportUser,
  type PeerRecommendation,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/hooks/useFetch";
import {
  getConnections,
  addConnection,
  removeConnection as removeConn,
  getInitialMessage,
  type Connection,
} from "@/lib/connections";

/* ── helpers ── */

const getThumbUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score >= 65) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className={cn("px-3 py-1 rounded-full border text-sm font-bold", scoreColor(score))}>
      {score}%
    </div>
  );
}

/* ── Triple-dot dropdown ── */

function DropdownMenu({
  actions,
}: {
  actions: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onClick();
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors",
                a.danger && "text-red-600 hover:bg-red-50",
              )}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Recommendation card (for two-col grid) ── */

type CardDecision = null | "connected" | "skipped";

function RecommendationCard({
  match,
  studentId,
  userName,
  onConnected,
  onDismiss,
}: {
  match: PeerRecommendation;
  studentId: string;
  userName: string;
  onConnected: (conn: Connection) => void;
  onDismiss: (peerId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [decision, setDecision] = useState<CardDecision>(null);
  const [fading, setFading] = useState(false);
  const score = Math.round(match.compatibility_score);

  const scheduleRemoval = (d: CardDecision) => {
    setDecision(d);
    if (d === "skipped") {
      setTimeout(() => setFading(true), 2000);
      setTimeout(() => onDismiss(match.peer_id), 2800);
    } else {
      // Same 2s as skipped — confetti is fast (0.9-1.4s) so it's done by then
      setTimeout(() => setFading(true), 2000);
      setTimeout(() => onDismiss(match.peer_id), 2800);
    }
  };

  const handleConnect = async () => {
    scheduleRemoval("connected");
    await submitFeedback(studentId, match.peer_id, true).catch(console.error);
    const messages = getInitialMessage(
      userName,
      match.display_name,
      match.icebreaker,
    );
    const conn: Connection = {
      peerId: match.peer_id,
      displayName: match.display_name,
      compatibilityScore: score,
      sharedThemes: match.shared_themes,
      explanation: match.explanation,
      icebreaker: match.icebreaker,
      chatMessages: messages,
      connectedAt: new Date().toISOString(),
    };
    addConnection(studentId, conn);
    window.dispatchEvent(new CustomEvent("open-chat", { detail: match.peer_id }));
    onConnected(conn);
  };

  const handleSkip = async () => {
    scheduleRemoval("skipped");
    await submitFeedback(studentId, match.peer_id, false).catch(console.error);
  };

  const borderClass =
    decision === "connected"
      ? "border-emerald-400 bg-emerald-50 shadow-emerald-200/60 shadow-lg"
      : decision === "skipped"
        ? "border-red-300 bg-red-50 shadow-red-200/40 shadow-lg"
        : "";

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-in-out",
        fading && "opacity-0 scale-95 max-h-0 !my-0 !py-0 overflow-hidden",
        !fading && "max-h-[800px]",
      )}
    >
      <Card
        className={cn(
          "card-hover transition-all duration-500 flex flex-col relative overflow-hidden",
          borderClass,
        )}
      >
        {/* Connected overlay */}
        {decision === "connected" && (
          <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
            <span className="text-xs font-semibold text-emerald-600/80 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
              🎉 Connected!
            </span>
          </div>
        )}

        {/* Skipped label — subtle, small */}
        {decision === "skipped" && (
          <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
            <span className="text-xs font-semibold text-red-400/80 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
              Skipped
            </span>
          </div>
        )}

        <CardContent className={cn("py-5 flex flex-col flex-1", decision && "opacity-40")}>
          {/* Top row */}
          <div className="flex items-center gap-3">
            <img
              src={getThumbUrl(match.display_name)}
              alt={match.display_name}
              className="w-14 h-14 rounded-full border border-[var(--color-border)] bg-white flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold">{match.display_name}</h3>
                <ScoreBadge score={score} />
              </div>
              <TagList
                tags={match.shared_themes}
                tagClassName="bg-slate-100 text-[var(--color-text-muted)] text-xs px-2 py-0.5"
                className="mt-1.5"
              />
            </div>
            {!decision && (
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
            )}
          </div>

          {/* Expanded details */}
          {expanded && !decision && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4 animate-fade-in-up">
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                  Why you match
                </h4>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  {match.explanation}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-muted)]">Emotional Compatibility</span>
                  <span className="font-semibold">{score}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)] transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              <div className="bg-[var(--color-primary-light)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-semibold text-amber-800">Suggested Icebreaker</span>
                </div>
                <p className="text-sm text-amber-900 italic">
                  &ldquo;{match.icebreaker}&rdquo;
                </p>
              </div>

              <div className="flex gap-3">
                <Button size="sm" onClick={handleConnect} className="flex-1">
                  <Heart className="w-4 h-4" />
                  Connect
                </Button>
                <Button variant="outline" size="sm" onClick={handleSkip} className="flex-1">
                  <XCircle className="w-4 h-4" />
                  Skip
                </Button>
                <DropdownMenu
                  actions={[
                    {
                      icon: <Ban className="w-4 h-4" />,
                      label: "Block",
                      onClick: () => blockUser(studentId, match.peer_id).catch(console.error),
                    },
                    {
                      icon: <Flag className="w-4 h-4" />,
                      label: "Report",
                      onClick: () =>
                        reportUser(studentId, match.peer_id, "Reported from connections page").catch(
                          console.error,
                        ),
                      danger: true,
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── My Connections list item ── */

function ConnectionItem({
  conn,
  studentId,
  onRemove,
}: {
  conn: Connection;
  studentId: string;
  onRemove: () => void;
}) {
  const openChat = () => {
    window.dispatchEvent(new CustomEvent("open-chat", { detail: conn.peerId }));
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[var(--color-border)] card-hover">
      <img
        src={getThumbUrl(conn.displayName)}
        alt={conn.displayName}
        className="w-11 h-11 rounded-full border border-[var(--color-border)] bg-white flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{conn.displayName}</h4>
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {conn.sharedThemes.slice(0, 3).join(" · ")}
        </p>
      </div>
      <ScoreBadge score={conn.compatibilityScore} />
      <button
        onClick={openChat}
        className="p-2 rounded-lg hover:bg-[var(--color-primary-light)] transition-colors"
        title="Open twin chat"
      >
        <MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />
      </button>
      <DropdownMenu
        actions={[
          {
            icon: <Trash2 className="w-4 h-4" />,
            label: "Remove",
            onClick: () => {
              removeConn(studentId, conn.peerId);
              onRemove();
            },
          },
          {
            icon: <Ban className="w-4 h-4" />,
            label: "Block",
            onClick: () => {
              blockUser(studentId, conn.peerId).catch(console.error);
              removeConn(studentId, conn.peerId);
              onRemove();
            },
          },
          {
            icon: <Flag className="w-4 h-4" />,
            label: "Report",
            onClick: () =>
              reportUser(studentId, conn.peerId, "Reported from connections page").catch(
                console.error,
              ),
            danger: true,
          },
        ]}
      />
    </div>
  );
}

/* ── Page ── */

export default function ConnectionsPage() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? "";
  const userName = user?.displayName ?? "You";
  const { data, loading } = useFetch(
    useCallback(() => getRecommendations(studentId), [studentId]),
  );

  const [connections, setConnections] = useState<Connection[]>([]);
  const [hiddenPeers, setHiddenPeers] = useState<Set<string>>(new Set());

  // Load connections from localStorage
  useEffect(() => {
    if (studentId) setConnections(getConnections(studentId));
    const sync = () => {
      if (studentId) setConnections(getConnections(studentId));
    };
    window.addEventListener("connections-updated", sync);
    return () => window.removeEventListener("connections-updated", sync);
  }, [studentId]);

  const connectedIds = new Set(connections.map((c) => c.peerId));
  const matches = (data ?? []).filter(
    (m) => !connectedIds.has(m.peer_id) && !hiddenPeers.has(m.peer_id),
  );

  if (loading) return <LoadingSpinner color="text-[var(--color-accent)]" />;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Users}
        iconColor="text-[var(--color-accent)]"
        title="Your Connections"
        description="Peers matched above 50% emotional compatibility. Only shared themes are shown — never raw journals."
      />

      {/* Safety notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up">
        <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Your privacy is protected</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            No raw journal content is shared. Matches are based on emotional patterns and themes
            only. You can skip, block, or report at any time.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-[var(--color-accent)]">
              {(data ?? []).length}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Matches Found</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-emerald-600">
              {Math.round(
                (data ?? []).reduce((a, b) => a + b.compatibility_score, 0) /
                ((data ?? []).length || 1),
              )}
              %
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Avg Compatibility</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {connections.length}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Connected</div>
          </CardContent>
        </Card>
      </div>

      {/* My Connections */}
      {connections.length > 0 && (
        <div className="animate-fade-in-up">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-[var(--color-warm)]" />
            My Connections
          </h2>
          <div className="space-y-2">
            {connections.map((c) => (
              <ConnectionItem
                key={c.peerId}
                conn={c}
                studentId={studentId}
                onRemove={() => setConnections(getConnections(studentId))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Peers — two-column grid */}
      {matches.length > 0 && (
        <div className="animate-fade-in-up">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
            Recommended Peers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {matches.map((match) => (
              <RecommendationCard
                key={match.peer_id}
                match={match}
                studentId={studentId}
                userName={userName}
                onConnected={() => setConnections(getConnections(studentId))}
                onDismiss={(peerId) =>
                  setHiddenPeers((prev) => new Set([...prev, peerId]))
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
