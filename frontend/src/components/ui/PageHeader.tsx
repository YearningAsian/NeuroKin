import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconColor = "text-[var(--color-primary)]",
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("animate-fade-in-up", className)}>
      <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
        <Icon className={cn("w-8 h-8", iconColor)} />
        {title}
      </h1>
      {description && (
        <p className="text-[var(--color-text-muted)] mt-1">{description}</p>
      )}
    </div>
  );
}
