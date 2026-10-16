import { type NextRequest, NextResponse } from "next/server";
import { authContext, requireUser } from "@/modules/auth/server";
export async function proxy(request: NextRequest) {
  try {
    const ctx = authContext(request);
    try {
      await requireUser(ctx);
    } catch {
      return ctx.finish(NextResponse.redirect(new URL("/acceso", request.url)));
    }
    return ctx.finish(NextResponse.next({ request }));
  } catch {
    return NextResponse.redirect(new URL("/acceso", request.url));
  }
}
export const config = { matcher: ["/cuenta"] };
