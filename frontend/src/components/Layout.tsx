import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Moon, Search, Sun } from "lucide-react";
import { api } from "../lib/api";
import { HOME_ITEM, NAV_ITEMS } from "../lib/nav";
import { useTheme } from "../lib/theme";
import CommandPalette from "./CommandPalette";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={13} strokeWidth={1.75} /> : <Moon size={13} strokeWidth={1.75} />}
      {theme === "dark" ? "Light" : "Dark"}
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
      <span className="relative flex h-1.5 w-1.5">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-good opacity-60" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            online === null ? "bg-ink-faint" : online ? "bg-status-good" : "bg-status-critical"
          }`}
        />
      </span>
      {online === null ? "Checking…" : online ? "Server online" : "Server unreachable"}
    </div>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? "bg-plane text-ink font-medium dark:bg-plane-dark dark:text-ink-dark"
      : "text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
  }`;
}

export default function Layout() {
  const [paletteHint, setPaletteHint] = useState("⌘K");

  useEffect(() => {
    if (typeof navigator !== "undefined" && !/Mac|iPhone|iPad/.test(navigator.platform)) {
      setPaletteHint("Ctrl K");
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <CommandPalette />
      <aside className="flex w-60 shrink-0 flex-col gap-8 border-r border-hairline bg-surface px-4 py-6 dark:border-hairline-dark dark:bg-surface-dark">
        <Link to="/" className="flex items-center gap-2.5 px-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-series-1 text-xs font-bold text-white">
            E
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight tracking-tight">ExplainHTTP</div>
            <div className="text-2xs leading-tight text-ink-muted dark:text-ink-muted-dark">
              HTTP/1.1 from scratch
            </div>
          </div>
        </Link>

        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex items-center gap-2 rounded-md border border-hairline px-2.5 py-1.5 text-left text-xs text-ink-faint transition-colors hover:border-baseline dark:border-hairline-dark dark:hover:border-baseline-dark"
        >
          <Search size={13} strokeWidth={1.75} />
          <span className="flex-1">Jump to…</span>
          <kbd className="mono rounded border border-hairline px-1 py-0.5 text-[10px] dark:border-hairline-dark">
            {paletteHint}
          </kbd>
        </button>

        <nav className="flex flex-1 flex-col gap-0.5">
          <NavLink to={HOME_ITEM.to} end={HOME_ITEM.end} className={navLinkClass}>
            <HOME_ITEM.icon size={15} strokeWidth={1.75} className="shrink-0 opacity-70" />
            {HOME_ITEM.label}
          </NavLink>

          <div className="mb-1 mt-5 px-3 text-2xs font-medium uppercase tracking-wide text-ink-faint">
            Operate
          </div>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              <item.icon size={15} strokeWidth={1.75} className="shrink-0 opacity-70" />
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
