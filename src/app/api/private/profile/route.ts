import { type NextRequest, NextResponse } from "next/server";
import { AccessError, checkMutation, jsonBody } from "@/modules/auth/security";
import { api, requireUser } from "@/modules/auth/server";
import { profileFields } from "@/modules/documents/brie-schema";
import { formPayload, rpcFailure } from "@/modules/documents/forms-server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return api(request, async (ctx) => {
    await requireUser(ctx);
    const { data, error } = await ctx.client
      .from("professional_profiles")
      .select("fields,revision")
      .maybeSingle();
    if (error) throw new AccessError(503, "unavailable");
    return NextResponse.json({ profile: data || { fields: {}, revision: 0 } });
  });
}
export async function POST(request: NextRequest) {
  return api(request, async (ctx) => {
    checkMutation(request);
    await requireUser(ctx);
    const { fields, revision } = formPayload(
      await jsonBody(request),
      profileFields,
    );
    const { data, error } = await ctx.client
      .rpc("save_professional_profile", {
        p_fields: fields,
        p_revision: revision,
      })
      .single();
    if (error) rpcFailure(error);
    return NextResponse.json({ profile: data });
  });
}
