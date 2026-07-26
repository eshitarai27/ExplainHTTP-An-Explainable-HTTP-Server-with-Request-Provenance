/**
 * One categorical slot per pipeline stage type, kept in a fixed order so a
 * component's color never shifts between the Execution Timeline, Graph
 * Viewer, and Metrics pages.
 */
export const STAGE_COLORS: Record<string, string> = {
  Request: "#2a78d6",
  Connection: "#eb6834",
  Parser: "#1baf7a",
  Router: "#eda100",
  Middleware: "#e87ba4",
  Handler: "#008300",
  Response: "#4a3aa7",
  Socket: "#e34948",
};

export const FALLBACK_COLOR = "#898781";

export function stageType(label: string): string {
  return label.split(":")[0];
}

export function colorForStage(label: string): string {
  return STAGE_COLORS[stageType(label)] ?? FALLBACK_COLOR;
}

export const STATUS_COLORS = {
  ok: "#0ca30c",
  error: "#d03b3b",
} as const;

export function colorForStatusCode(status: number): string {
  if (status >= 500) return "#d03b3b";
  if (status >= 400) return "#ec835a";
  if (status >= 300) return "#fab219";
  return "#0ca30c";
}
