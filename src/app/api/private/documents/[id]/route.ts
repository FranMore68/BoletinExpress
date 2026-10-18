import { type NextRequest, NextResponse } from "next/server";
import { AccessError } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { ownedDocument } from "@/modules/private-documents/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const doc = await ownedDocument(ctx, (await params).id);
    const { data, error } = await ctx.client
      .from("document_files")
      .select("id,created_at")
      .eq("document_id", doc.id)
      .eq("ready", true)
      .order("created_at");
    if (error) throw new AccessError(503, "unavailable");
    const time = await ctx.client.rpc("document_time");
    if (time.error) throw new AccessError(503, "unavailable");
    return NextResponse.json({
      document: doc,
      files: data,
      documentTime: time.data,
    });
  });
}
