import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  /** Optional action to display below the description */
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
}: Readonly<EmptyStateProps>) {
  return (
    <div className={cn("text-center py-16", className)} role="status">
      <Icon className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" aria-hidden="true" />
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {description && (
        <p className="text-[var(--color-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
