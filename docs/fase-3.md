# Fase 3 · Acceso y aislamiento

**Estado: todas las comprobaciones superadas; pendiente de aceptación del cierre.** Las fases 0, 1 y 2 están aceptadas. No se ha iniciado la fase 4 ni se ha intervenido en el VPS.

## Entrega

Acceso ES/CA en `/acceso` y cuenta privada en `/cuenta`: registro, confirmación explícita del correo, acceso, reenvío, recuperación y cierre global de sesiones. Sesiones de servidor con cookies HttpOnly/SameSite y Secure cuando se utiliza HTTPS. Cada operación privada comprueba usuario confirmado y sesión activa. El permiso de recuperación está firmado, caduca y se vincula al usuario y su sesión.

Borradores y PDF ficticios en PostgreSQL y Storage privados, con RLS por propietario. La aplicación utiliza anon y el JWT del usuario, sin service_role ni credenciales administrativas. Vistas y descargas por rutas autenticadas, sin enlaces públicos ni firmados reutilizables. La pasarela bloquea publicación, firma y transformación. Los usuarios no pueden asignar propietario, estado o saldo. Las funciones de creación y reserva bloquean transacciones para aplicar los límites de borradores y archivos.

El entorno exclusivo incluye PostgreSQL, Auth, PostgREST, Storage, pasarela, plantillas y Mailpit, además de web y worker. Acceso local: http://127.0.0.1:3000/acceso?lang=es. Los correos llegan al [buzón local](http://127.0.0.1:54324) y no salen a Internet; la interfaz ya lo explica en ES/CA. Resend SMTP queda para la preparación del despliegue. Formularios completos, perfil profesional, créditos, IA y conservación siguen sus fases previstas.

## Pruebas y evidencias

Fuente comprobada: commit `e09bdd19dbb61084b246a025a3739113f4c0c99b`. [CI 39052031663, completado correctamente](https://github.com/FranMore68/BoletinExpress/actions/runs/39052031663).

| Prueba | Resultado | Evidencia en `evidence/phase-3/` |
|---|---|---|
| Estilo, TypeScript, pruebas de aplicación y búsqueda de secretos | Superada; 13 pruebas | `promotion-check-2026-10-17.log`, `ci-run.json` |
| Compilación de Next.js y contenedores en Linux AMD64 | Superada | `ci-run.json` |
| Generación PDF ya existente | 43 pruebas superadas | `promotion-pdf-2026-10-17.log`, CI |
| Crypto, configuración, utilidades y regresiones de migración Auth | 57 pruebas principales superadas | `auth-promotion-build-2026-10-17.log`, compilación de CI |
| Auditorías npm de aplicación, PDF y Storage | Sin avisos altos/críticos; Storage conserva moderados permitidos por el criterio acordado | pasos 5, 6 y 10 de `ci-run.json` |
| Interfaz de acceso ES/CA, móvil de 320 px y escritorio | Superada en los estados registrados | `ui-checks.json`, capturas previas y `local-resend-screen-2026-10-17.png` |
| Registro, reenvío, confirmación explícita y enlace de un uso | Superada | `isolation.json`, `isolation.log` |
| Dos cuentas, acceso directo a RLS/Storage, rutas privadas y manipulación de propietario/estado/saldo | Superada | `isolation.json` |
| PDF privado, descarga y vista autenticada; tipos/tamaños inválidos | Superada | `isolation.json` |
| Concurrencia, tres borradores y límite de intentos | Superada | `isolation.json` |
| Recuperación restringida, sesiones revocadas, JWT caducado y cookies manipuladas | Superada | `isolation.json` |
| Batería de acceso y aislamiento completa | 12 grupos superados en Linux y Mac | `isolation.json`, `promotion/isolation.json` |
| Auditoría de las nueve imágenes | **0 altos y 0 críticos, sin exclusiones** | `audit-pgx5-2026-10-17.json`, `image-*.json` |
| Sesión y borrador creados antes de actualizar Auth | Conservados tras la migración | `auth-continuity-2026-10-17.json` |
| Nueve servicios locales, cuotas, memoria y reinicios | Activos, sin OOM ni reinicios; 3008 MiB y 1 CPU configurados | `promotion/runtime.json` |
| Versión de Auth realmente activa | `v2.197.0-be2-pgx5` | `promotion/auth-health.json` |

Las pruebas utilizan cuentas y documentación ficticias. Los informes de integración confirman `pass: true`, `complete: true` y doce grupos. Las credenciales de prueba no se publican. Las respuestas privadas no se almacenan en caché; cada descarga vuelve a comprobar la autorización.

## Resolución del bloqueo de seguridad

La auditoría inicial registró 218 avisos altos/críticos. Las actualizaciones oficiales y las correcciones de dependencias, Storage y el helper de PostgreSQL redujeron el resultado a un alto: CVE-2026-32286 en `pgproto3/v2`, una rama sin mantenimiento. Se conserva el resultado anterior en `audit-2026-10-17.json`.

Tras un [ensayo independiente](prueba-auth-pgx5.md) aceptado por el usuario, el Auth habitual conserva la fuente oficial v2.197.0 verificada por SHA-256, actualiza Pop a v6.4.1 y utiliza pgx/v5 v5.11.0. Se adaptan dos importaciones del tipo de error PostgreSQL; no se modifica el código del protocolo. Los manifiestos de `infra/supabase/auth-runtime` fijan las dependencias. La construcción rechaza la presencia de las bibliotecas antiguas tanto en el árbol de módulos como en el ejecutable. Las pruebas adicionales verifican longitudes inválidas de DataRow y errores PostgreSQL envueltos.

El ensayo independiente superó las mismas doce comprobaciones y quedó detenido conservando sus volúmenes. Tras promover el cambio se repitieron las comprobaciones locales, la continuidad de una sesión/borrador existentes y CI en Linux AMD64. La auditoría final completa da cero altos y cero críticos sin ignorar vulnerabilidades. El bloqueo técnico de seguridad queda resuelto.

## Incidencias resueltas y fallos pendientes

Se corrigieron el rol authenticated que Auth todavía utiliza al registrar usuarios, el prefijo PKCE de los hashes, la selección de un solo registro en las funciones de creación/reserva, las cuotas mínimas de Docker y las sondas de arranque. La prueba de límite de intentos utiliza una clave nueva y una ráfaga para no depender de una ventana anterior.

La primera comprobación de continuidad se adelantó al arranque de Auth. Se añadió una sonda `/health`, la pasarela espera su estado saludable y la repetición pasó. El fallo inicial se conserva en `auth-continuity-startup-race-2026-10-17.log`. El reenvío de confirmación recibe ahora una prueba explícita de segundo mensaje y la interfaz indica el destino local del correo.

**Sin fallos técnicos bloqueantes pendientes para esta fase.** Falta la aceptación del cierre por el usuario. La capacidad del VPS y Control-Contracts-ATC se comprobarán en fase 10; los límites configurados del Mac no sustituyen esa medición.

## Reproducción y siguiente fase

El arranque, migración y actualización de Auth se describen en `infra/supabase/README.md`. Los secretos están excluidos de Git. La actualización conserva claves, base y volúmenes. La imagen anterior queda disponible para reversión local como `boletinexpress-auth:phase3-before-pgx5-20261017`; contiene el aviso anterior y no es una imagen aprobada para desplegar.

La revisión actual está en `pre-commit-review.md` y el estado legible por herramientas en `status.json`. Los fallos e informes anteriores se conservan como historial.

Cuando se acepte el cierre, la fase 4 empezará por [Mi perfil](perfil-electricista.md), para guardar los datos de empresa e instalador y reutilizarlos en el BRIE y, en fase 5, en el CIE. No se ha adelantado su implementación.
