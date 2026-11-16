import { AuthFailure, canAccess, verifiedIdentity } from "../../../lib/firebase-server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  const headers={"Cache-Control":"no-store, private",Vary:"Authorization"};
  try {
    const identity=await verifiedIdentity(request);
    if(!canAccess(identity)) return Response.json({message:"Acesso negado."},{status:403,headers});
    if(process.env.NODE_ENV!=="development" || process.env.TUTOR_DEV_MOCK!=="true") return Response.json({message:"Tutor ainda indisponível. Provedor e quotas precisam ser configurados."},{status:503,headers});
    const raw=await request.text();
    if(raw.length>4096) return Response.json({message:"Pedido muito grande."},{status:413,headers});
    const body=JSON.parse(raw);
    if(!["explain","analogy"].includes(body.action)) return Response.json({message:"Ação inválida."},{status:400,headers});
    return Response.json({message:body.action==="analogy"?"Simulação de desenvolvimento: uma analogia relaciona um conceito a uma situação familiar. Identifique as correspondências, indique onde a comparação deixa de funcionar e retorne à definição formal. Consulte a analogia da aula, quando disponível.":"Simulação de desenvolvimento: releia a definição, acompanhe o exemplo resolvido e compare sua justificativa com as evidências da seção. Este mock não responde perguntas nem avalia conhecimento."},{headers});
  } catch(error) {return Response.json({message:"Suporte indisponível."},{status:error instanceof AuthFailure?error.status:400,headers});}
}
