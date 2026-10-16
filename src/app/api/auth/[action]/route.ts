import { type NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  appOrigin,
  checkMutation,
  emailValue,
  jsonBody,
  passwordValue,
  recoveryProof,
  sameProof,
  stringValue,
} from "@/modules/auth/security";
import { api, requireUser, throttle } from "@/modules/auth/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  return api(request, async (ctx) => {
    if ((await params).action !== "session")
      throw new AccessError(404, "not_found");
    const user = await requireUser(ctx);
    return NextResponse.json({ email: user.email, id: user.id });
  });
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  return api(request, async (ctx) => {
    checkMutation(request);
    const { action } = await params;
    if (action === "logout") {
      const logout = await ctx.client.auth.signOut({ scope: "global" });
      if (logout.error) throw new AccessError(503, "unavailable");
      const res = NextResponse.json({ ok: true });
      res.cookies.set("be-recovery", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });
      return res;
    }
    const body = await jsonBody(request);
    if (["signup", "login", "recover", "resend"].includes(action)) {
      const email = emailValue(body);
      await throttle(ctx, action === "login" ? "login" : "email", email);
      if (action === "signup") {
        const password = passwordValue(body);
        const result = await ctx.client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${appOrigin()}/auth/confirm` },
        });
        if (result.error)
          throw new AccessError(
            result.error.status === 429 ? 429 : 400,
            "registration",
          );
        return NextResponse.json({ ok: true });
      }
      if (action === "login") {
        const password = stringValue(body, "password", 128);
        const result = await ctx.client.auth.signInWithPassword({
          email,
          password,
        });
        if (result.error) throw new AccessError(401, "credentials");
        await requireUser(ctx);
        return NextResponse.json({ ok: true });
      }
      // Uniform response: never disclose whether an address has an account.
      if (action === "recover")
        await ctx.client.auth.resetPasswordForEmail(email, {
          redirectTo: `${appOrigin()}/auth/confirm`,
        });
      else
        await ctx.client.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${appOrigin()}/auth/confirm` },
        });
      return NextResponse.json({ ok: true });
    }
    if (action === "confirm") {
      const hash = stringValue(body, "token_hash", 128);
      const type = stringValue(body, "type", 16);
      if (
        !/^[a-f0-9]{32,128}$/i.test(hash) ||
        !["email", "recovery"].includes(type)
      )
        throw new AccessError(400, "link");
      await throttle(ctx, "confirm", hash);
      const result = await ctx.client.auth.verifyOtp({
        token_hash: hash,
        type: type as "email" | "recovery",
      });
      if (result.error || !result.data.session || !result.data.user)
        throw new AccessError(400, "link");
      const res = NextResponse.json({
        ok: true,
        recovery: type === "recovery",
      });
      if (type === "recovery") {
        const payload = JSON.parse(
          Buffer.from(
            result.data.session.access_token.split(".")[1],
            "base64url",
          ).toString(),
        );
        res.cookies.set(
          "be-recovery",
          recoveryProof(result.data.user.id, payload.session_id),
          {
            httpOnly: true,
            secure: appOrigin().startsWith("https:"),
            sameSite: "lax",
            path: "/",
            maxAge: 600,
          },
        );
      }
      return res;
    }
    if (action === "password") {
      const user = await requireUser(ctx);
      const { data } = await ctx.client.auth.getSession();
      if (!data.session) throw new AccessError(401, "session");
      const payload = JSON.parse(
        Buffer.from(
          data.session.access_token.split(".")[1],
          "base64url",
        ).toString(),
      );
      const proof = request.cookies.get("be-recovery")?.value || "";
      if (!sameProof(proof, recoveryProof(user.id, payload.session_id)))
        throw new AccessError(403, "link");
      const result = await ctx.client.auth.updateUser({
        password: passwordValue(body),
      });
      if (result.error) throw new AccessError(400, "password");
      const logout = await ctx.client.auth.signOut({ scope: "global" });
      if (logout.error) throw new AccessError(503, "unavailable");
      const res = NextResponse.json({ ok: true });
      res.cookies.set("be-recovery", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return res;
    }
    throw new AccessError(404, "not_found");
  });
}
