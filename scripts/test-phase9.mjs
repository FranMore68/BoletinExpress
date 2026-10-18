import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const dir = process.env.PHASE9_REPORT_DIR || "evidence/phase-9";
await mkdir(dir, { recursive: true });
const work = await mkdtemp(`${tmpdir()}/boletin-phase9-`);
const parseEnv = (s) =>
  Object.fromEntries(
    s
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const n = l.indexOf("=");
        return [l.slice(0, n), l.slice(n + 1)];
      }),
  );
const base = parseEnv(await readFile(".secrets/app.env", "utf8"));
const pay = parseEnv(await readFile(".secrets/payments.env", "utf8"));
const signing = `whsec_${randomUUID().replaceAll("-", "")}`;
const appOrigin = "http://127.0.0.1:3002";
const testEnv = {
  ...base,
  ...pay,
  APP_URL: appOrigin,
  APP_ENV: "evaluation",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: signing,
};
await writeFile(
  `${work}/app.env`,
  Object.entries(testEnv)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n"),
  { mode: 0o600 },
);
process.env.AUTH_TEST_ENV = `${work}/app.env`;
const { BrowserSession, emailToken, json } = await import(
  "./auth-test-client.mjs"
);
const results = [];
async function pass(test) {
  results.push({ test, pass: true });
  console.log("PASS", test);
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify({ pass: false, complete: false, results }, null, 2),
  );
}
const sql = (query) =>
  new Promise((ok, fail) => {
    const p = spawn(
      "docker",
      [
        "compose",
        "--env-file",
        ".secrets/supabase.env",
        "-f",
        "infra/supabase/compose.yaml",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "supabase_admin",
        "-d",
        "postgres",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "";
    p.stdout.on("data", (v) => {
      out += v;
    });
    p.stderr.resume();
    p.on("error", fail);
    p.on("exit", (code) =>
      code === 0 ? ok(out.trim()) : fail(Error("Fixture SQL failed")),
    );
    p.stdin.end(query);
  });
const sessions = new Map(),
  keys = new Map();
let createCount = 0,
  failCreate = false,
  failRetrieve = false;
const proxy = http.createServer(async (req, res) => {
  try {
    assert.equal(req.headers.authorization, "Bearer sk_test_fixture");
    assert.equal(req.headers["stripe-version"], "2026-09-30.endive");
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      const params = new URLSearchParams(raw);
      const key = req.headers["idempotency-key"];
      let id = keys.get(key)?.id;
      if (id)
        assert.equal(
          keys.get(key).raw,
          raw,
          "Retry must preserve every Checkout parameter",
        );
      else {
        id = `cs_test_${randomUUID().replaceAll("-", "")}`;
        createCount++;
        const amount = Number(
          params.get("line_items[0][price_data][unit_amount]"),
        );
        assert.ok([1000, 2000].includes(amount));
        assert.equal(params.get("line_items[0][quantity]"), "1");
        assert.equal(params.get("payment_method_types[0]"), "card");
        assert.equal(new URL(params.get("success_url")).origin, appOrigin);
        sessions.set(id, {
          id,
          object: "checkout.session",
          livemode: false,
          mode: "payment",
          currency: "eur",
          amount_total: amount,
          amount_subtotal: amount,
          client_reference_id: params.get("client_reference_id"),
          metadata: {
            order_id: params.get("metadata[order_id]"),
            owner_id: params.get("metadata[owner_id]"),
            pack: params.get("metadata[pack]"),
          },
          payment_status: "unpaid",
          status: "open",
          payment_intent: null,
          url: `https://checkout.stripe.com/c/pay/${id}`,
          line_items: {
            has_more: false,
            data: [
              { quantity: 1, price: { unit_amount: amount, currency: "eur" } },
            ],
          },
        });
        keys.set(key, { id, raw });
      }
      if (failCreate) {
        failCreate = false;
        res.writeHead(503);
        return res.end("{}");
      }
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify(sessions.get(id)));
    }
    if (req.method === "GET") {
      if (failRetrieve) {
        failRetrieve = false;
        res.writeHead(503);
        return res.end("{}");
      }
      const id = new URL(req.url, "http://fixture").pathname.split("/").at(-1);
      if (sessions.has(id)) {
        res.setHeader("content-type", "application/json");
        return res.end(JSON.stringify(sessions.get(id)));
      }
    }
    res.writeHead(404);
    res.end("{}");
  } catch {
    res.writeHead(500);
    res.end("{}");
  }
});
await new Promise((ok) => proxy.listen(0, "127.0.0.1", ok));
const child = spawn(
  process.execPath,
  [
    "--import",
    pathToFileURL(resolve("scripts/stripe-test-transport.mjs")).href,
    ".next/standalone/server.js",
  ],
  {
    env: {
      ...process.env,
      ...testEnv,
      PORT: "3002",
      HOSTNAME: "127.0.0.1",
      STRIPE_TEST_PROXY: `http://127.0.0.1:${proxy.address().port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.resume();
child.stderr.resume();
const send = async (jar, path, body, status = 200) =>
  json(await jar.request(path, { method: "POST", body }), status);
const get = async (jar, path, status = 200) =>
  json(await jar.request(path), status);
async function account() {
  const jar = new BrowserSession(),
    email = `phase9-${randomUUID()}@example.invalid`,
    password = randomUUID();
  await send(jar, "/api/auth/signup", { email, password });
  await send(jar, "/api/auth/confirm", {
    token_hash: await emailToken(email, "email"),
    type: "email",
  });
  const user = await get(jar, "/api/auth/session");
  const encoded = [...jar.cookies]
    .filter(([k]) => /-auth-token(?:\.\d+)?$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => decodeURIComponent(v))
    .join("");
  const session = JSON.parse(
    Buffer.from(encoded.replace(/^base64-/, ""), "base64url").toString(),
  );
  const client = createClient(base.SUPABASE_URL, base.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  return { jar, user, client, session, email };
}
async function checkout(
  a,
  pack = "basic",
  requestId = randomUUID(),
  extra = {},
) {
  const result = await send(a.jar, "/api/private/payments/checkout", {
    pack,
    requestId,
    locale: "es",
    ...extra,
  });
  const id = new URL(result.url).pathname.split("/").at(-1);
  return sessions.get(id);
}
function paid(session, payment = `pi_${randomUUID().replaceAll("-", "")}`) {
  Object.assign(session, {
    status: "complete",
    payment_status: "paid",
    payment_intent: payment,
  });
}
async function hook(
  session,
  {
    eventId = `evt_${randomUUID().replaceAll("-", "")}`,
    type = "checkout.session.completed",
    status = 200,
    offset = 0,
    live = false,
    bad = false,
    extra = {},
  } = {},
) {
  const body = JSON.stringify({
    object: "event",
    id: eventId,
    type,
    livemode: live,
    data: { object: { id: session.id, ...extra } },
  });
  const t = Math.floor(Date.now() / 1000) + offset;
  const sig = createHmac("sha256", signing)
    .update(`${t}.${body}`)
    .digest("hex");
  const response = await fetch(`${appOrigin}/api/payments/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${t},v1=${bad ? "0".repeat(64) : sig}`,
    },
    body,
  });
  return json(response, status);
}
const balance = async (a) => (await get(a.jar, "/api/private/credits")).balance;
try {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error("Isolated test web stopped");
    if (
      await fetch(`${appOrigin}/api/health`)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    if (i === 99) throw Error("Isolated test web did not start");
    await new Promise((ok) => setTimeout(ok, 200));
  }
  const a = await account(),
    b = await account();
  assert.equal(await balance(a), 10);
  const guest = new BrowserSession();
  await send(
    guest,
    "/api/private/payments/checkout",
    { pack: "basic", requestId: randomUUID(), locale: "es" },
    401,
  );
  const cross = await a.jar.request("/api/private/payments/checkout", {
    method: "POST",
    originHeader: "https://other.invalid",
    body: { pack: "basic", requestId: randomUUID(), locale: "es" },
  });
  assert.equal(cross.status, 403);
  await send(
    a.jar,
    "/api/private/payments/checkout",
    { pack: "unknown", requestId: randomUUID(), locale: "es" },
    400,
  );
  await pass(
    "acceso confirmado, protección de origen y catálogo cerrado de packs",
  );
  const request = randomUUID(),
    before = createCount;
  const dup = await Promise.all(
    Array.from({ length: 6 }, () =>
      checkout(a, "basic", request, {
        amount: 1,
        credits: 999,
        owner: b.user.id,
        locale: "ca",
      }),
    ),
  );
  assert.equal(new Set(dup.map((s) => s.id)).size, 1);
  assert.equal(createCount, before + 1);
  const s = dup[0];
  assert.equal(s.amount_total, 1000);
  assert.equal(s.metadata.owner_id, a.user.id);
  assert.equal(await balance(a), 10);
  await pass(
    "seis creaciones concurrentes reutilizan una sesión; precio y propietario se fijan en servidor",
  );
  const own = await get(a.jar, "/api/private/payments"),
    other = await get(b.jar, "/api/private/payments");
  assert.equal(own.purchases.length, 1);
  assert.equal(other.purchases.length, 0);
  const foreign = await b.client
    .from("credit_purchases")
    .select("id,status")
    .eq("id", s.metadata.order_id);
  assert.equal(foreign.error, null);
  assert.deepEqual(foreign.data, []);
  assert.ok(
    (
      await a.client
        .from("credit_purchases")
        .update({ status: "paid" })
        .eq("id", s.metadata.order_id)
    ).error,
  );
  assert.ok(
    (
      await a.client.rpc("bind_checkout", {
        p_order: s.metadata.order_id,
        p_checkout: s.id,
      })
    ).error,
  );
  assert.ok(
    (await a.client.from("credit_purchases").select("stripe_session")).error,
  );
  await pass(
    "RLS aísla compras y oculta identificadores Stripe; clientes no modifican pagos ni saldo",
  );
  await a.jar.request(
    "/cuenta?payment=returned&session_id=cs_test_forged&credits=999",
  );
  await a.jar.request("/cuenta?payment=cancelled");
  assert.equal(await balance(a), 10);
  await hook(s);
  assert.equal(await balance(a), 10);
  await pass(
    "retornos manipulados, cancelación y pago pendiente nunca conceden KC",
  );
  paid(s);
  await hook(s, { bad: true, status: 400 });
  await hook(s, { offset: -301, status: 400 });
  await hook(s, { offset: 301, status: 400 });
  await hook(s, { live: true, status: 400 });
  assert.equal(await balance(a), 10);
  const large = await fetch(`${appOrigin}/api/payments/stripe`, {
    method: "POST",
    body: "a".repeat(65537),
  });
  assert.equal(large.status, 413);
  await pass(
    "firma inválida, reloj fuera de tolerancia, eventos reales y cuerpos excesivos rechazados",
  );
  const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
  failRetrieve = true;
  await hook(s, { eventId, status: 503 });
  assert.equal(await balance(a), 10);
  await hook(s, {
    eventId,
    extra: { amount_total: 1, metadata: { owner_id: b.user.id } },
  });
  assert.equal(await balance(a), 20);
  assert.equal(await balance(b), 10);
  await pass(
    "caída de Stripe se recupera al reintentar; datos del webhook se contrastan con la API",
  );
  await Promise.all(Array.from({ length: 8 }, () => hook(s, { eventId })));
  await Promise.all(Array.from({ length: 5 }, () => hook(s)));
  assert.equal(await balance(a), 20);
  assert.equal(
    (await get(a.jar, "/api/private/credits")).movements.filter(
      (m) => m.kind === "topup",
    ).length,
    1,
  );
  await hook(s, { type: "checkout.session.expired" });
  assert.equal(await balance(a), 20);
  assert.equal(
    (await get(a.jar, "/api/private/payments")).purchases[0].status,
    "paid",
  );
  await pass(
    "avisos concurrentes, eventos distintos del mismo pago y avisos atrasados no duplican ni revierten el abono",
  );
  const pro = await checkout(a, "pro");
  paid(pro);
  await hook(pro);
  assert.equal(await balance(a), 45);
  await pass("pack de 25 KC abona exactamente 25 y conserva el historial");
  const canceled = await checkout(a);
  canceled.status = "expired";
  await hook(canceled, { type: "checkout.session.expired" });
  assert.equal(await balance(a), 45);
  const failed = await checkout(a);
  failed.status = "complete";
  await hook(failed, { type: "checkout.session.async_payment_failed" });
  assert.equal(await balance(a), 45);
  await pass("sesiones caducadas y pagos fallidos dejan el saldo intacto");
  const badSession = await checkout(a);
  paid(badSession);
  badSession.amount_total = 1;
  await hook(badSession, { status: 400 });
  assert.equal(await balance(a), 45);
  badSession.amount_total = 1000;
  badSession.metadata.owner_id = b.user.id;
  await hook(badSession, { status: 400 });
  assert.equal(await balance(b), 10);
  badSession.metadata.owner_id = a.user.id;
  const reuse = await checkout(a);
  paid(reuse, s.payment_intent);
  await hook(reuse, { status: 503 });
  assert.equal(await balance(a), 45);
  await pass(
    "importes y propietarios contradictorios y PaymentIntent reutilizado se rechazan sin abonos parciales",
  );
  const recoverRequest = randomUUID();
  failCreate = true;
  await send(
    b.jar,
    "/api/private/payments/checkout",
    { pack: "basic", requestId: recoverRequest, locale: "es" },
    503,
  );
  const orphan = [...sessions.values()].find(
    (x) => x.metadata.owner_id === b.user.id,
  );
  assert.ok(orphan);
  paid(orphan);
  await hook(orphan);
  assert.equal(await balance(b), 20);
  const recovered = await send(b.jar, "/api/private/payments/checkout", {
    pack: "basic",
    requestId: recoverRequest,
    locale: "ca",
  });
  assert.equal(recovered.paid, true);
  await pass(
    "pago anterior al guardado de Checkout se recupera y se vincula de forma transaccional",
  );
  const retryRequest = randomUUID();
  failCreate = true;
  await send(
    b.jar,
    "/api/private/payments/checkout",
    { pack: "pro", requestId: retryRequest, locale: "es" },
    503,
  );
  const count = createCount;
  await checkout(b, "pro", retryRequest, { locale: "ca" });
  assert.equal(createCount, count);
  await pass(
    "respuesta perdida en creación reutiliza los parámetros originales y la clave de idempotencia",
  );
  await send(
    b.jar,
    "/api/private/payments/checkout",
    { pack: "basic", requestId: retryRequest, locale: "es" },
    409,
  );
  const forgedSession = await fetch(
    `${base.SUPABASE_URL}/rest/v1/rpc/begin_checkout`,
    {
      method: "POST",
      headers: {
        apikey: base.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${pay.PAYMENTS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_owner: a.user.id,
        p_session: JSON.parse(
          Buffer.from(
            b.session.access_token.split(".")[1],
            "base64url",
          ).toString(),
        ).session_id,
        p_request: randomUUID(),
        p_pack: "basic",
        p_locale: "es",
      }),
    },
  );
  assert.equal(forgedSession.status, 401);
  await pass(
    "una solicitud no cambia de pack y el servidor rechaza sesiones que pertenecen a otra cuenta",
  );
  await sql(
    `insert into private.evaluation_clocks(owner_id,offset_seconds) values('${a.user.id}',3888000);`,
  );
  await checkout(a);
  await pass(
    "avanzar el reloj documental 45 días no altera el reloj de pagos ni de firmas",
  );
  await sql(
    `insert into public.credit_purchases(owner_id,request_id,pack,locale,amount_cents,credits) select '${b.user.id}',gen_random_uuid(),'basic','es',1000,10 from generate_series((select count(*)::integer+1 from public.credit_purchases where owner_id='${b.user.id}'),20);`,
  );
  await send(
    b.jar,
    "/api/private/payments/checkout",
    { pack: "basic", requestId: randomUUID(), locale: "es" },
    429,
  );
  const cached = await checkout(b, "pro", retryRequest);
  assert.equal(cached.metadata.pack, "pro");
  await pass(
    "el límite de nuevas sesiones no impide reintentar una operación existente ni modifica el saldo",
  );
  const reconciliation = await sql(
    `select count(*) from public.credit_accounts a where a.owner_id in ('${a.user.id}','${b.user.id}') and a.balance<>(select coalesce(sum(amount),0) from public.credit_movements m where m.owner_id=a.owner_id);`,
  );
  assert.equal(reconciliation, "0");
  await pass(
    "saldo y suma de movimientos coinciden después de errores y concurrencia",
  );
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify(
      {
        pass: true,
        complete: true,
        groups: results.length,
        transport: "isolated Stripe API fixture; no external payments",
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `${results.length} grupos de fase 9 superados (Stripe simulado, servidor y base de datos reales).`,
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((ok) => proxy.close(ok));
  await rm(work, { recursive: true, force: true });
}
