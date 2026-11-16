import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MathText } from "../src/components/math-text";
import { normalizeMathText } from "../src/lib/math-format";

describe("shared mathematical content",()=>{
 it("formats the full fraction expression from the game question",()=>{
  const html=renderToStaticMarkup(<MathText>{"Qual é o resultado de 3/4 - (1/6 - 1/3)?"}</MathText>);
  expect(html).toContain("katex");expect(html).toContain("<mfrac>");
  expect(html.match(/<mfrac>/g)).toHaveLength(3);
  expect(html).toContain("Qual é o resultado de");
 });
 it.each(["11/12","7/12","1/2","5/12","4,2 * 10^-3","x^2","√16"])("renders plain expression %s",value=>{
  const html=renderToStaticMarkup(<MathText>{value}</MathText>);
  expect(html).toContain("katex");expect(html).not.toContain("math-fallback");
 });
 it("preserves explicit LaTeX without rewriting it",()=>{
  const text=String.raw`Exemplo $\frac{3}{4}$ e $$x^{2}$$`;
  expect(normalizeMathText(text)).toBe(text);
 });
 it("does not interpret dates, URLs or ordinary prose as formulas",()=>{
  for(const text of ["16/11/2026","2026-11-16","https://example.com/1/2","A aula tem 4 exemplos."])
   expect(normalizeMathText(text)).toBe(text);
 });
 it("preserves invalid math and escapes untrusted HTML",()=>{
  const html=renderToStaticMarkup(<MathText>{String.raw`<script>alert(1)</script> $\invalidcommand$`}</MathText>);
  expect(html).not.toContain("<script>");expect(html).toContain("math-fallback");
 });
});
