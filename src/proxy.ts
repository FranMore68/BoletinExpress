import { type NextRequest, NextResponse } from "next/server";
import { authContext, requireUser } from "@/modules/auth/server";
export async function proxy(request: NextRequest) {
  const login = new URL("/acceso", request.url);
  if (request.nextUrl.searchParams.get("lang") === "ca")
    login.searchParams.set("lang", "ca");
  try {
    const ctx = authContext(request);
    try {
      await requireUser(ctx);
    } catch {
      return ctx.finish(NextResponse.redirect(login));
    }
    return ctx.finish(NextResponse.next({ request }));
  } catch {
    return NextResponse.redirect(login);
  }
}
export const config = { matcher: ["/cuenta"] };
