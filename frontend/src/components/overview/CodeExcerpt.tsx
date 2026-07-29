const KEYWORDS = new Set([
  "def", "class", "with", "if", "elif", "else", "return", "raise", "import", "from", "as",
  "True", "False", "None", "and", "or", "not", "in", "is", "for", "while", "try", "except",
  "finally", "pass", "self", "lambda", "yield", "assert",
]);

const TOKEN_RE = /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')|(\b\d+(\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([^\sA-Za-z0-9_]+)/gm;

function tokenize(line: string) {
  const tokens: { text: string; kind: string }[] = [];
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;
  while ((match = TOKEN_RE.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), kind: "plain" });
    }
    const [text, comment, string] = match;
    if (comment) tokens.push({ text, kind: "comment" });
    else if (string) tokens.push({ text, kind: "string" });
    else if (/^\d/.test(text)) tokens.push({ text, kind: "number" });
    else if (KEYWORDS.has(text)) tokens.push({ text, kind: "keyword" });
    else if (/^[A-Za-z_]/.test(text)) tokens.push({ text, kind: "ident" });
    else tokens.push({ text, kind: "punct" });
    lastIndex = TOKEN_RE.lastIndex;
  }
  if (lastIndex < line.length) tokens.push({ text: line.slice(lastIndex), kind: "plain" });
  return tokens;
}

const KIND_CLASS: Record<string, string> = {
  keyword: "text-series-7 dark:text-[#9b8ce0]",
  string: "text-series-3",
  comment: "text-ink-faint italic",
  number: "text-series-4",
  ident: "text-ink dark:text-ink-dark",
  punct: "text-ink-muted dark:text-ink-muted-dark",
  plain: "text-ink-muted dark:text-ink-muted-dark",
};

export default function CodeExcerpt({ title, code }: { title?: string; code: string }) {
  const lines = code.replace(/^\n/, "").replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark">
      {title && (
        <div className="mono border-b border-hairline bg-plane px-4 py-2 text-2xs text-ink-faint dark:border-hairline-dark dark:bg-plane-dark">
          {title}
        </div>
      )}
      <pre className="mono overflow-x-auto bg-surface px-4 py-3 text-xs leading-relaxed dark:bg-surface-dark">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            <span className="mr-4 inline-block w-4 select-none text-right text-ink-faint/50">{i + 1}</span>
            {tokenize(line).map((t, j) => (
              <span key={j} className={KIND_CLASS[t.kind]}>
                {t.text}
              </span>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}
