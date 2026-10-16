# Fase 1: base técnica

Fecha: 16/10/2026. Estado: en comprobación. La fase 0 fue aceptada mediante «Ok» y la fase 2 no ha comenzado.

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
| Auditoría de imágenes | En comprobación | Informes Trivy pendientes |
| Repositorio privado y CI remota | Repositorio verificado vacío; conexión local preparada | Pendiente primer commit revisado y ejecución CI |

La selección inicial de lint arrastraba un aviso alto de `braces` mediante `eslint-config-next`. Se retiró esa configuración y se usa Biome fijado, con auditoría sin avisos. Referencia de seguridad del framework comprobada: [actualización oficial del 14/10/2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026). La aplicación usa Next 16.4.2.

Se sustituyó Docker Scout por Trivy local después de que la revisión automática rechazara la posible transmisión de un inventario privado. El análisis descarga previamente la base pública y examina las imágenes con red desactivada. El primer intento encontró un montaje de caché de solo lectura incompatible con Trivy; se corrigió. No se usa el informe de un análisis fallido como evidencia favorable.

## Reproducción y alcance

[Comandos y límites de contenedores](../infra/README.md). El presupuesto configurado de esta fase es 768 MiB y 0,75 CPU. No es una medición de capacidad del VPS; la prueba conjunta con Supabase y Control-Contracts-ATC sigue prevista antes del despliegue.

Pendientes para cerrar: auditoría de imágenes, revisión del primer commit, publicación en el repositorio privado y comprobaciones remotas. La aceptación del usuario se solicitará con la tabla terminada.
