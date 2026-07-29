import type { LucideIcon } from "lucide-react";
import Panel from "./Panel";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: LucideIcon;
}

export default function StatTile({ label, value, hint, accent, icon: Icon }: StatTileProps) {
  return (
    <Panel className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-muted-dark">
        {Icon && <Icon size={13} strokeWidth={1.75} className="text-ink-faint" />}
        {label}
      </div>
      <div
        className="tabular mt-2 text-2xl font-semibold tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </Panel>
  );
}
