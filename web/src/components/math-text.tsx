import katex from "katex";

/** Renders only delimited TeX; ordinary text remains escaped by React. */
export function MathText({ children }: { children: string }) {
  const parts = children.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g);
  return <>{parts.map((part, index) => {
    const display = part.startsWith("$$") || part.startsWith("\\[");
    const delimited = display || part.startsWith("\\(") || (part.startsWith("$") && part.endsWith("$"));
    if (!delimited) return part;
    const formula = part.slice(display || part.startsWith("\\(") ? 2 : 1, display || part.startsWith("\\(") ? -2 : -1);
    try {
      return <span key={index} className={display ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: katex.renderToString(formula, { displayMode: display, throwOnError: true, trust: false, output: "htmlAndMathml", maxExpand: 1000 }) }} />;
    } catch { return <span key={index} className="math-fallback">{part}</span>; }
  })}</>;
}
