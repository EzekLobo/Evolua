const explicitMath = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;
const protectedText = /(https?:\/\/[^\s]+|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/g;
const atom = String.raw`(?:√\s*)?(?:\d+(?:[.,]\d+)?|[a-zA-Z])(?:\s*\^\s*\(?[−-]?\d+\)?)?`;
const expression = new RegExp(String.raw`(?<![\w/.:])${atom}(?:\s*[/*×÷+−=<>≤≥-]\s*\(*\s*${atom}\s*\)*)*(?![\w/])`, "g");

function convertExpression(value:string) {
  // Ordinary prose/numbers are preserved; dates and URLs are protected upstream.
  if (!/[\d]/.test(value) || !/[\/^√*×÷=<>≤≥+−-]/.test(value)) return value;
  const tex=value.trim()
    .replace(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/g, String.raw`\frac{$1}{$2}`)
    .replace(/\^\s*\(?([−-]?\d+)\)?/g, (_,power:string)=>`^{${power.replace("−","-")}}`)
    .replace(/√\s*(\d+(?:[.,]\d+)?)/g, String.raw`\sqrt{$1}`)
    .replace(/[*×]/g,String.raw`\times `)
    .replace(/÷/g,String.raw`\div `)
    .replace(/≤/g,String.raw`\leq `).replace(/≥/g,String.raw`\geq `)
    .replace(/−/g,"-").replace(/(\d),(\d)/g,"$1{,}$2");
  return `$${tex}$`;
}

/** Conservative plain-text math recognition. Explicit LaTeX is left intact. */
export function normalizeMathText(text:string):string {
  return text.split(explicitMath).map((part,index)=>index%2 ? part :
    part.split(protectedText).map((chunk,i)=>i%2 ? chunk : chunk.replace(expression,convertExpression)).join("")
  ).join("");
}
