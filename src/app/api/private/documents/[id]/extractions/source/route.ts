import { type NextRequest, NextResponse } from "next/server";
import { AccessError, uuid } from "@/modules/auth/security";
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
    const id = uuid(request.nextUrl.searchParams.get("job") || "");
    const { data } = await ctx.client
      .from("document_extractions")
      .select("object_path,mime")
      .eq("id", id)
      .eq("document_id", doc.id)
      .maybeSingle();
    if (!data?.object_path) throw new AccessError(404, "not_found");
    const file = await ctx.client.storage
      .from("sources")
      .download(data.object_path);
    if (file.error || !file.data) throw new AccessError(404, "not_found");
    return new NextResponse(file.data, {
      headers: {
        "Content-Type": data.mime,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy":
          "sandbox; default-src 'none'; frame-ancestors 'none'",
      },
    });
  });
}
