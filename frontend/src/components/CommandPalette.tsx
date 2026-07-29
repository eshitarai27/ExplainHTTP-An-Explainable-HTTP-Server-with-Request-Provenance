import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CornerDownLeft, Hash } from "lucide-react";
import { HOME_ITEM, NAV_ITEMS } from "../lib/nav";

const ITEMS = [HOME_ITEM, ...NAV_ITEMS];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const looksLikeTraceId = /^[a-f0-9]{8,}$/i.test(query.trim());
  const filteredNav = ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const results: { key: string; label: string; sub?: string; go: () => void }[] = looksLikeTraceId
    ? [
        {
          key: "trace",
          label: `Open trace ${query.trim()}`,
          sub: "Jump straight to its execution timeline",
          go: () => navigate(`/traces/${query.trim()}/timeline`),
        },
      ]
    : filteredNav.map((item) => ({
        key: item.to,
        label: item.label,
        go: () => navigate(item.to),
      }));

  const runHighlighted = () => {
    const target = results[highlight];
    if (target) {
      target.go();
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 pt-[18vh] backdrop-blur-[1px] dark:bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-hairline bg-surface shadow-popover dark:border-hairline-dark dark:bg-surface-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-2.5 dark:border-hairline-dark">
          <Hash size={14} strokeWidth={1.75} className="shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runHighlighted();
              }
            }}
            placeholder="Go to page, or paste a trace ID…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <div className="px-3.5 py-6 text-center text-xs text-ink-faint">No matches</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.key}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => {
                r.go();
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm ${
                i === highlight
                  ? "bg-plane text-ink dark:bg-plane-dark dark:text-ink-dark"
                  : "text-ink-muted dark:text-ink-muted-dark"
              }`}
            >
              <span>
                {r.label}
                {r.sub && <span className="mono ml-2 text-xs text-ink-faint">{r.sub}</span>}
              </span>
              {i === highlight && <ArrowRight size={13} strokeWidth={1.75} />}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-hairline px-3.5 py-2 text-2xs text-ink-faint dark:border-hairline-dark">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={11} strokeWidth={1.75} /> to select
          </span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
