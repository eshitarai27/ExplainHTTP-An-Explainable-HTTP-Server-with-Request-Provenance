import { colorForStatusCode } from "../lib/colors";

export function StatusCodeBadge({ status }: { status: number }) {
  const color = colorForStatusCode(status);
  return (
    <span
      className="tabular inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {status}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: "ok" | "error" }) {
  const color = status === "ok" ? "#0ca30c" : "#d03b3b";
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className="tabular inline-flex items-center rounded border border-hairline dark:border-hairline-dark px-1.5 py-0.5 text-xs font-medium text-ink-muted dark:text-ink-muted-dark">
      {method}
    </span>
  );
}
