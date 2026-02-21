import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  value: number;
  /** Tailwind gradient class for the filled bar */
  gradient?: string;
}

export function ProgressBar({
  label,
  value,
  gradient = "bg-gradient-to-r from-emerald-400 to-emerald-500",
}: Readonly<ProgressBarProps>) {
  const pct = Math.round(value);
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="w-full h-3 rounded-full bg-slate-100">
        <div
          className={cn("h-3 rounded-full transition-all", gradient)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
