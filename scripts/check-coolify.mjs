import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../infra/coolify/compose.yaml", import.meta.url),
  "utf8",
);
// Propiedad de Coolify documentada para servicios de una sola ejecución.
// Docker Compose estándar no la reconoce; el resto se valida sin excepciones.
assert.equal((source.match(/^ {4}exclude_from_hc: true$/gm) || []).length, 1);
const result = spawnSync(
  "docker",
  [
    "compose",
    "--env-file",
    "/dev/null",
    "-p",
    "boletinexpress-validation",
    "-f",
    "-",
    "config",
    "--no-interpolate",
    "--no-env-resolution",
    "--format",
    "json",
  ],
  {
    input: source.replace(/^ {4}exclude_from_hc: true\n/m, ""),
    encoding: "utf8",
  },
);
if (result.status !== 0) throw Error(result.stderr);
const config = JSON.parse(result.stdout);
const services = Object.entries(config.services);
assert.equal(services.length, 10);
let memory = 0;
let cpu = 0;
for (const [name, service] of services) {
  assert.equal(
    service.pull_policy,
    "never",
    `${name}: imágenes precargadas sin login global`,
  );
  assert(
    !service.build && !service.ports && !service.container_name,
    `${name}: sin compilación, puertos del host ni nombres globales`,
  );
  assert(!service.env_file, `${name}: secretos mediante variables del recurso`);
  const limit = /^(\d+)m$/i.exec(String(service.mem_limit));
  assert(limit, `${name}: límite de memoria explícito en MiB`);
  memory += Number(limit[1]) * 1024 ** 2;
  cpu += Number(service.cpus);
  assert(
    !JSON.stringify(service.volumes || []).includes('"type":"bind"'),
    `${name}: sin acceso al host`,
  );
  if (name !== "web")
    assert(
      !("default" in service.networks),
      `${name}: fuera de la red del proxy`,
    );
  if (!["worker", "mail"].includes(name))
    assert(
      !("egress" in service.networks),
      `${name}: sin red de salida auxiliar`,
    );
  if (name !== "worker")
    assert.equal(
      service.environment?.OPENAI_API_KEY,
      "disabled",
      `${name}: clave IA anulada aunque Coolify inyecte .env`,
    );
  for (const key of [
    "POSTGRES_PASSWORD",
    "JWT_SECRET",
    "ANON_KEY",
    "SERVICE_ROLE_KEY",
    "WORKER_KEY",
    "CREDITS_API_KEY",
    "PAYMENTS_API_KEY",
    "EXTRACTION_API_KEY",
    "AUTH_PROOF_SECRET",
    "RESEND_API_KEY",
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ]) {
    const used = Object.values(service.environment).some((v) =>
      String(v).includes(`\${${key}`),
    );
    if (!used)
      assert.equal(
        service.environment[key],
        "disabled",
        `${name}: ${key} anulada`,
      );
  }
}
assert(memory <= 3072 * 1024 ** 2);
assert(cpu <= 1.00001);
assert.equal(config.networks.data.internal, true);
for (const network of Object.values(config.networks)) assert(!network.external);
for (const volume of Object.values(config.volumes)) assert(!volume.external);
assert.equal(
  config.services.web.depends_on.migrate.condition,
  "service_completed_successfully",
);
assert.equal(
  config.services.worker.depends_on.migrate.condition,
  "service_completed_successfully",
);
assert.equal(config.services.migrate.restart, "no");
assert.equal(
  config.services.mail.environment.MP_SMTP_RELAY_BLOCKED_RECIPIENTS,
  "(?i)@([^@]*\\.)?invalid$$",
);
console.log(
  JSON.stringify(
    {
      services: services.map(([n]) => n),
      memoryMiB: memory / 1024 ** 2,
      cpus: Number(cpu.toFixed(2)),
      hostPorts: 0,
      sharedExternalNetworks: 0,
      composeValid: true,
      coolifySpecificField: "migrate.exclude_from_hc",
    },
    null,
    2,
  ),
);
