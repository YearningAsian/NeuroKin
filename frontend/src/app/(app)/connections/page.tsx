"use client";

import { useState, memo } from "react";
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
  Flag,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecommendations, submitFeedback, reportUser, type PeerRecommendation } from "@/lib/api";
import { DEMO_STUDENT_ID } from "@/lib/user";
import { useFetch } from "@/hooks/useFetch";

const avatarColors = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-red-500",
  "from-cyan-400 to-blue-500",
];

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score >= 65) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className={cn("px-3 py-1 rounded-full border text-sm font-bold", color)}>
      {score}%
    </div>
  );
}

function MatchCardInner({ match, colorIdx }: { match: PeerRecommendation; colorIdx: number }) {
  const [expanded, setExpanded] = useState(false);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const avatarColor = avatarColors[colorIdx % avatarColors.length];
  const score = Math.round(match.compatibility_score);

  const handleConnect = async () => {
    setAccepted(true);
    await submitFeedback(DEMO_STUDENT_ID, match.peer_id, true).catch(console.error);
  };
  const handleSkip = async () => {
    setAccepted(false);
    await submitFeedback(DEMO_STUDENT_ID, match.peer_id, false).catch(console.error);
  };
  const handleReport = async () => {
    await reportUser(DEMO_STUDENT_ID, match.peer_id, "Reported from connections page").catch(console.error);
  };

  if (accepted === false) return null;

  return (
    <Card className={cn("card-hover transition-all", accepted && "border-emerald-200 bg-emerald-50/50")}>
      <CardContent className="py-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg flex-shrink-0",
              avatarColor
            )}
          >
            {match.display_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-bold">{match.display_name}</h3>
              <ScoreBadge score={score} />
              {accepted && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
            </div>
            <TagList
              tags={match.shared_themes}
              tagClassName="bg-slate-100 text-[var(--color-text-muted)] text-xs px-2 py-0.5"
              className="mt-1.5"
            />
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
                <span className="font-semibold">{score}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warm)] transition-all"
                  style={{ width: `${score}%` }}
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
                  onClick={handleConnect}
                  className="flex-1"
                >
                  <Heart className="w-4 h-4" />
                  Connect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4" />
                  Skip
                </Button>
                <Button variant="ghost" size="sm" className="text-[var(--color-text-muted)]" onClick={handleReport}>
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

const MatchCard = memo(MatchCardInner);

export default function ConnectionsPage() {
  const { data, loading } = useFetch(() => getRecommendations(DEMO_STUDENT_ID));
  const matches = data ?? [];

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
            No raw journal content is shared. Matches are based on emotional patterns and themes only. You can skip, block, or report at any time.
          </p>
        </div>
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-[var(--color-accent)]">{matches.length}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Matches Found</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-emerald-600">
              {Math.round(matches.reduce((a, b) => a + b.compatibility_score, 0) / (matches.length || 1))}%
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Avg Compatibility</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {matches.filter((m) => m.compatibility_score >= 75).length}
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
          {matches.map((match, idx) => (
            <MatchCard key={match.peer_id} match={match} colorIdx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
