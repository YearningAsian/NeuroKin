import { cn } from "@/lib/utils";

interface TagListProps {
  tags: string[];
  /** Tailwind classes for each tag pill */
  tagClassName?: string;
  className?: string;
}

export function TagList({
  tags,
  tagClassName = "bg-[var(--color-primary-light)] text-amber-800",
  className,
}: Readonly<TagListProps>) {
  if (!tags.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((t) => (
        <span
          key={t}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full font-medium",
            tagClassName
          )}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
