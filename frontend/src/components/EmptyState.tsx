import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  hint?: string;
}

export default function EmptyState({ icon: Icon, title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {Icon && <Icon size={20} strokeWidth={1.5} className="text-ink-faint" />}
      <div className="text-sm text-ink-muted dark:text-ink-muted-dark">{title}</div>
      {hint && <div className="mono text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}
