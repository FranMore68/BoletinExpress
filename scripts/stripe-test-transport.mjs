// Loaded only by test-phase9.mjs in an isolated child process. Not copied to the web image.
// No application route or production environment variable enables this transport.
const proxy = new URL(process.env.STRIPE_TEST_PROXY);
const app = new URL(process.env.APP_URL);
if (
  process.env.APP_ENV !== "evaluation" ||
  app.hostname !== "127.0.0.1" ||
  app.port !== "3002" ||
  proxy.hostname !== "127.0.0.1" ||
  proxy.protocol !== "http:" ||
  process.env.STRIPE_SECRET_KEY !== "sk_test_fixture"
)
  throw Error("Fixture transport is local-only");
const realFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url || input);
  if (url.origin === "https://api.stripe.com")
    return realFetch(new URL(`${url.pathname}${url.search}`, proxy), options);
  return realFetch(input, options);
};
