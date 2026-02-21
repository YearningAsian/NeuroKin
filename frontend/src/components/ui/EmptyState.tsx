import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div className={cn("text-center py-16", className)}>
      <Icon className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {description && (
        <p className="text-[var(--color-text-muted)]">{description}</p>
      )}
    </div>
  );
}
