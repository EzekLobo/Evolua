import katex from "katex";

function automaticMath(text:string) {
  return text.replace(/\b\d+(?:[.,]\d+)?\s*[*×]\s*10\s*\^\s*(?:\(?([−-]?\d+)\)?)/g, (value,exponent:string)=>`$${value.split(/[*×]/)[0].trim().replace(",","{,}")} \\times 10^{${exponent.replace("−","-")}}$`)
    .replace(/(?<![\w$^])([a-zA-Z]|\d+(?:[.,]\d+)?)\^([−-]?\d+)(?![\w}])/g,"$$$1^{$2}$$")
    .replace(/√\s*(\d+(?:[.,]\d+)?)/g,"$\\sqrt{$1}$");
}
/** Explicit TeX takes precedence; recognizes a conservative subset of plain math. */
export function MathText({ children }: { children: string }) {
  const delimiter=/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;
  const normalized=children.split(delimiter).map((part,i)=>i%2?part:automaticMath(part)).join("");
  const parts = normalized.split(delimiter);
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
