import katex from "katex";
import { normalizeMathText } from "../lib/math-format";
/** Explicit TeX takes precedence; recognizes a conservative subset of plain math. */
export function MathText({ children }: { children: string }) {
  const delimiter=/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;
  const normalized=normalizeMathText(children);
  const parts = normalized.split(delimiter);
  return <>{parts.map((part, index) => {
    const display = part.startsWith("$$") || part.startsWith("\\[");
    const delimited = display || part.startsWith("\\(") || (part.startsWith("$") && part.endsWith("$"));
    if (!delimited) return part;
    const formula = part.slice(display || part.startsWith("\\(") ? 2 : 1, display || part.startsWith("\\(") ? -2 : -1);
    try {
      return <span key={index} role="math" aria-label={formula} className={display ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: katex.renderToString(formula, { displayMode: display, throwOnError: true, trust: false, output: "htmlAndMathml", maxExpand: 1000 }) }} />;
    } catch { return <span key={index} className="math-fallback">{part}</span>; }
  })}</>;
}
