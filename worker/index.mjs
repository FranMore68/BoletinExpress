import { createServer } from "node:http";

// Base del proceso. La cola PostgreSQL y sus handlers se añadirán en sus fases.
// No se simulan trabajos, cobros, limpieza ni envíos.
const server = createServer((request, response) => {
  if (request.method !== "GET" || request.url !== "/health") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({
      status: "ok",
      service: "boletinexpress-worker",
      jobsEnabled: false,
    }),
  );
});
server.listen(3001, process.env.HOSTNAME || "127.0.0.1", () =>
  console.log(JSON.stringify({ event: "worker_started", jobsEnabled: false })),
);
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
