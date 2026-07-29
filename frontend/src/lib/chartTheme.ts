/**
 * Recharts and React Flow take raw color values via props, not Tailwind
 * classes, so they can't react to the `dark` class the way the rest of the
 * app does. This is the single place that mirrors the relevant tokens from
 * tailwind.config.js for the two chart libraries to consume directly.
 */
export interface ChartTheme {
  hairline: string;
  hairlineFaint: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  surface: string;
  plane: string;
  accent: string;
}

const LIGHT: ChartTheme = {
  hairline: "#e1e0d9",
  hairlineFaint: "#e1e0d966",
  ink: "#0b0b0b",
  inkMuted: "#52514e",
  inkFaint: "#898781",
  surface: "#fcfcfb",
  plane: "#f9f9f7",
  accent: "#2a78d6",
};

const DARK: ChartTheme = {
  hairline: "#2c2c2a",
  hairlineFaint: "#2c2c2a66",
  ink: "#ffffff",
  inkMuted: "#c3c2b7",
  inkFaint: "#898781",
  surface: "#1a1a19",
  plane: "#0d0d0d",
  accent: "#4f97e8",
};

export function getChartTheme(theme: "light" | "dark"): ChartTheme {
  return theme === "dark" ? DARK : LIGHT;
}
