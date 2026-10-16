# Fase 1: base técnica

Fecha: 16/10/2026. Estado: **aceptada por el usuario mediante «Ok» el 16/10/2026**. La fase 2 queda autorizada.

Se han creado Next.js con TypeScript y Tailwind, módulos de documentos/créditos/extracción/pagos/conservación, un worker separado, imágenes de contenedor, Compose y comprobaciones de CI. El prototipo PDF de la fase 0 se conserva separado.

La base no implementa todavía acceso, RLS, cola, cobros, IA, correo ni conservación operativa. Esas funciones se integrarán en las fases correspondientes. No hay secretos reales ni conexión a otras aplicaciones.

## Evidencias

| Prueba | Resultado actual | Evidencia |
|---|---|---|
| Instalación con lockfile y scripts externos desactivados | Superada | `evidence/phase-1/npm-ci.log` |
| Lint y tipos | Superados | `evidence/phase-1/check.log` |
| Detector de secretos y arranque/cierre del worker | 2 pruebas superadas | `evidence/phase-1/check.log` |
| Regresión del prototipo PDF | 43 pruebas superadas | `evidence/phase-1/pdf-regression.log` |
| Compilación Next local | Superada desde caché limpia | `evidence/phase-1/build.log` |
| Construcción web y worker | Superada | `evidence/phase-1/docker-build-web.log`, `docker-build-worker.log` |
| Salud HTTP y rutas privadas sin publicar | Superada | `evidence/phase-1/smoke.json` |
| Auditorías npm de aplicación y PDF | 0 vulnerabilidades conocidas | `evidence/phase-1/npm-audit.json`, `pdf-npm-audit.json` |
| Auditoría de imágenes | Web y worker: 0 avisos altos o críticos | [Web](../evidence/phase-1/image-web.json), [worker](../evidence/phase-1/image-worker.json) |
| Repositorio privado y CI remota | Publicación y ejecución completa superadas desde instalación limpia en Linux amd64 | [Repositorio](https://github.com/FranMore68/BoletinExpress), [ejecución CI](https://github.com/FranMore68/BoletinExpress/actions/runs/38855942045) |

La selección inicial de lint arrastraba un aviso alto de `braces` mediante `eslint-config-next`. Se retiró esa configuración y se usa Biome fijado, con auditoría sin avisos. Referencia de seguridad del framework comprobada: [actualización oficial del 14/10/2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026). La aplicación usa Next 16.4.2.

Se sustituyó Docker Scout por Trivy local después de que la revisión automática rechazara la posible transmisión de un inventario privado. El análisis descarga previamente la base pública y examina las imágenes con red desactivada. El primer intento encontró un montaje de caché de solo lectura incompatible con Trivy; se corrigió. No se usa el informe de un análisis fallido como evidencia favorable.

## Reproducción y alcance

[Comandos y límites de contenedores](../infra/README.md). El presupuesto configurado de esta fase es 768 MiB y 0,75 CPU. No es una medición de capacidad del VPS; la prueba conjunta con Supabase y Control-Contracts-ATC sigue prevista antes del despliegue.

No quedan fallos detectados en las comprobaciones de esta fase. Aceptación recibida; se inicia la fase 2.

El commit de código comprobado en GitHub es `3c8943e62591749814e461e00279fbedf1f65b93`. Las actualizaciones posteriores de este informe y las evidencias no modifican ese código. [Estado resumido](../evidence/phase-1/status.json).

[Revisión previa al commit](../evidence/phase-1/pre-commit-review.md): APTO PARA COMMIT. Se revisaron seguridad, calidad, impacto funcional, rendimiento, secretos y dependencias.

La configuración aplicada se ha leído de los contenedores en ejecución: [restricciones y límites](../evidence/phase-1/containers.jsonl). Una muestra puntual local registró unos 41 MiB para web y 20 MiB para worker, ambos en reposo: [medición](../evidence/phase-1/local-resources.jsonl). No extrapolar estas cifras al uso completo ni al VPS compartido.

Node dentro de las imágenes: 24.22.0, alineado con `.nvmrc` y CI. La comprobación secundaria en macOS utilizó el runtime local 24.19.0. El primer intento de compilación local falló al crear un puerto en el sandbox; tras limpiar la caché generada y repetir con los permisos necesarios, terminó correctamente. La instalación limpia en GitHub también pasó.

El entorno local deja una web provisional en http://127.0.0.1:3000. Su propósito es verificar la infraestructura; todavía no es el recorrido de usuario ES/CA.
