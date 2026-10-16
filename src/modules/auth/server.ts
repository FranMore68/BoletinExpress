import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { AccessError, appOrigin, hashAttempt } from "./security.ts";
export function authContext(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new AccessError(503, "unavailable");
  const patches: { name: string; value: string; options: CookieOptions }[] = [];
  const secure = new URL(appOrigin()).protocol === "https:";
  const client = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        patches.push(...values);
        for (const v of values) request.cookies.set(v.name, v.value);
      },
    },
  });
  function finish(response: NextResponse) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Vary", "Cookie");
    for (const p of patches)
      response.cookies.set(p.name, p.value, {
        ...p.options,
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
      });
    return response;
  }
  return { client, finish, request };
}
export type AuthContext = ReturnType<typeof authContext>;
export async function requireUser(ctx: AuthContext) {
  const { data, error } = await ctx.client.auth.getUser();
  if (error || !data.user?.email_confirmed_at)
    throw new AccessError(401, "session");
  const active = await ctx.client.rpc("session_active");
  if (active.error) {
    console.error("session_check_failed", {
      code: active.error.code,
      message: active.error.message,
    });
    throw new AccessError(503, "unavailable");
  }
  if (active.data !== true) throw new AccessError(401, "session");
  return data.user;
}
export async function throttle(
  ctx: AuthContext,
  action: string,
  email: string,
) {
  const result = await ctx.client.rpc("consume_auth_attempt", {
    p_key: hashAttempt(`${action}:${email}`),
  });
  if (result.error) {
    console.error("auth_throttle_failed", {
      code: result.error.code,
      message: result.error.message,
    });
    throw new AccessError(503, "unavailable");
  }
  if (result.data !== true) throw new AccessError(429, "rate");
}
export function failure(error: unknown) {
  const status = error instanceof AccessError ? error.status : 503;
  return NextResponse.json(
    { error: error instanceof AccessError ? error.code : "unavailable" },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
export async function api(
  request: NextRequest,
  handler: (ctx: AuthContext) => Promise<NextResponse>,
) {
  let ctx: AuthContext | undefined;
  try {
    ctx = authContext(request);
    return ctx.finish(await handler(ctx));
  } catch (error) {
    const res = failure(error);
    return ctx ? ctx.finish(res) : res;
  }
}
