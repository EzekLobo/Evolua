import { AuthFailure, canAccess, isOwner, verifiedIdentity } from "../../../../lib/firebase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store, private", "Vary": "Authorization" };
  try {
    const identity = await verifiedIdentity(request);
    if (!canAccess(identity)) return Response.json({ allowed: false, canGenerate: false }, { status: 403, headers });
    return Response.json({ allowed: true, canGenerate: isOwner(identity) }, { headers });
  } catch (error) {
    return Response.json({ allowed: false, canGenerate: false }, {
      status: error instanceof AuthFailure ? error.status : 503, headers,
    });
  }
}
