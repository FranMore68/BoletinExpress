import { AccessError, uuid } from "../auth/security.ts";
import type { AuthContext } from "../auth/server.ts";
export async function ownedDocument(ctx: AuthContext, id: string) {
  uuid(id);
  const { data, error } = await ctx.client
    .from("documents")
    .select(
      "id,type,title,status,created_at,validated_at,work_data,revision,draft_expires_at,renewal_active,manual_keys",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AccessError(503, "unavailable");
  if (!data) throw new AccessError(404, "not_found");
  return data as {
    id: string;
    type: "BRIE" | "CIE";
    title: string;
    status: string;
    created_at: string;
    validated_at: string | null;
    work_data: Record<string, string | boolean>;
    revision: number;
    draft_expires_at: string | null;
    renewal_active: boolean;
    manual_keys: string[];
  };
}
export async function pdfBody(request: Request) {
  if (request.headers.get("content-type") !== "application/pdf")
    throw new AccessError(415, "format");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "input");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2097152) {
      await reader.cancel();
      throw new AccessError(413, "size");
    }
    chunks.push(value);
  }
  const result = Buffer.concat(chunks);
  if (!result.subarray(0, 5).equals(Buffer.from("%PDF-")))
    throw new AccessError(400, "pdf");
  return result;
}
