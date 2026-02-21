import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  /** Tailwind color class, e.g. "text-purple-500" */
  color?: string;
}

export function LoadingSpinner({
  className,
  color = "text-[var(--color-primary)]",
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center h-64", className)}>
      <Loader2 className={cn("w-8 h-8 animate-spin", color)} />
    </div>
  );
}
