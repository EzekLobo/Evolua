import { generateCandidate, saveCandidate } from "../../../../lib/content-ai/generate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const host = request.headers.get("host");
  if (process.env.NODE_ENV !== "development" || process.env.CONTENT_AI_ENABLED !== "true" ||
      !host || !/^127\.0\.0\.1(?::\d+)?$/.test(host) ||
      request.headers.has("origin") || request.headers.get("x-evolua-local") !== "generate") {
    return new Response(null, { status: 404 });
  }
  const body = await request.text();
  if (body.length > 32_000) return new Response(null, { status: 413 });
  try {
    const candidate = await generateCandidate(JSON.parse(body));
    return Response.json({ file: saveCandidate(candidate), status: candidate.status });
  } catch {
    return Response.json({
      error: "Geração recusada. Confira o manifesto, as autorizações, os trechos e a configuração do Gemini.",
    }, { status: 422 });
  }
}
