interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

export default function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
      <div className="text-xs text-ink-muted dark:text-ink-muted-dark">{label}</div>
      <div
        className="tabular mt-1.5 text-2xl font-semibold tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}
