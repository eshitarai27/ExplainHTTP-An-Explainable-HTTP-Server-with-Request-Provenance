import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "■" },
  { to: "/traces", label: "Trace Viewer", icon: "◉" },
  { to: "/metrics", label: "Metrics", icon: "▲" },
  { to: "/logs", label: "Logs", icon: "≡" },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="rounded-md border border-hairline dark:border-hairline-dark px-2.5 py-1.5 text-xs text-ink-muted dark:text-ink-muted-dark hover:text-ink dark:hover:text-ink-dark hover:border-baseline dark:hover:border-baseline-dark transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀ Light" : "☽ Dark"}
    </button>
  );
}

function ServerStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      api
        .getMetrics()
        .then(() => !cancelled && setOnline(true))
        .catch(() => !cancelled && setOnline(false));
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted dark:text-ink-muted-dark">
      <span
        className={`h-2 w-2 rounded-full ${
          online === null ? "bg-ink-faint" : online ? "bg-status-good" : "bg-status-critical"
        }`}
      />
      {online === null ? "Checking..." : online ? "Server online" : "Server unreachable"}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-4 py-6 flex flex-col gap-8">
        <div>
          <div className="text-sm font-semibold tracking-tight">ExplainHTTP</div>
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark mt-0.5">
            An explainable HTTP/1.1 server
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-plane dark:bg-plane-dark text-ink dark:text-ink-dark font-medium"
                    : "text-ink-muted dark:text-ink-muted-dark hover:text-ink dark:hover:text-ink-dark"
                }`
              }
            >
              <span className="text-[10px] opacity-60">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <ServerStatus />
          <ThemeToggle />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
