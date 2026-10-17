# Fase 3 · Acceso y aislamiento

Estado: migración de Auth a pgx/v5 incorporada al entorno local; pendiente de la comprobación final en CI y de aceptación del cierre. La fase 2 está aceptada. No se ha intervenido en el VPS.

## Entrega

Acceso ES/CA en `/acceso` y cuenta privada en `/cuenta`: registro, confirmación explícita del correo, acceso, reenvío, recuperación y cierre global de sesiones. Las sesiones se gestionan en servidor con cookies HttpOnly/SameSite. Cada operación privada comprueba el usuario confirmado y la vigencia de su sesión; la recuperación requiere un permiso firmado, con caducidad y vinculado al usuario y su sesión.

Los borradores y sus PDF ficticios se guardan en PostgreSQL y Storage privados, con RLS por propietario. La aplicación utiliza anon y el JWT del usuario, sin service_role ni credenciales administrativas. Las vistas y descargas pasan por rutas autenticadas; no se generan enlaces públicos ni firmados. La pasarela bloquea las rutas de publicación y firma. Las operaciones sensibles de base de datos solo se permiten mediante funciones con permisos limitados y bloqueo para el máximo de tres borradores.

El entorno exclusivo incluye PostgreSQL, Auth, PostgREST, Storage, pasarela, plantillas y Mailpit. Los correos de evaluación se capturan en el buzón local y no salen a Internet. Resend SMTP queda para la preparación del despliegue, con remitente verificado y secretos fuera del repositorio. Créditos, campos documentales completos, IA y conservación se incorporarán en sus fases.

## Pruebas y evidencias

| Prueba | Resultado | Evidencia |
|---|---|---|
| Estilo, TypeScript, pruebas unitarias y búsqueda de secretos | Superada; 13 pruebas unitarias | `evidence/phase-3/check.log` y CI |
| Compilación de Next.js | Superada | `evidence/phase-3/build.log` y CI |
| Pruebas de PDF ya existentes | Superada; 43 pruebas | CI |
| Auditorías npm de aplicación y PDF | Sin vulnerabilidades | CI |
| Auditoría npm de Storage corregido | Sin avisos altos o críticos; quedan moderados | `evidence/phase-3/storage-npm-audit.json` y CI |
| Interfaz de acceso ES/CA, móvil de 320 px y escritorio | Superada en los estados registrados | `evidence/phase-3/ui-checks.json` y capturas |
| Registro, recuperación, dos cuentas, rutas y Storage | Superada; 12 grupos de integración | `evidence/phase-3/isolation.json` y CI |
| Auditoría de las nueve imágenes | Completa: ocho sin altos/críticos; Auth conserva un alto y cero críticos | `evidence/phase-3/audit-2026-10-17.json` |

La [integración final](https://github.com/FranMore68/BoletinExpress/actions/runs/39047620981) se ejecuta en el Linux temporal de GitHub Actions con dos cuentas ficticias distintas, credenciales aleatorias que no se conservan y un PDF de ejemplo. Comprueba propiedad también con llamadas directas a RLS/Storage, vistas y descargas, cookies manipuladas, sesiones revocadas y caducadas, concurrencia y límites de acceso. El archivo `isolation.json` confirma `pass: true`, `complete: true` y doce grupos superados. Se han preservado los registros de fallos anteriores, separados del resultado final.

## Correcciones comprobadas y pendientes

Se han corregido el rol authenticated que Auth todavía usa al crear usuarios, el prefijo pkce_ de los hashes de correo y la selección de un solo registro en las funciones de creación y reserva. La migración se ejecuta por consola con supabase_admin; la aplicación no utiliza ese administrador. Se han añadido comprobaciones de disponibilidad de Storage y pasarela para no iniciar las pruebas mientras los procesos aún arrancan. La auditoría elimina cada archivo temporal tras analizar su imagen.

La auditoría inicial registró 218 avisos altos/críticos. La actualización de servicios oficiales redujo el resultado a 59 altos. Se han actualizado dependencias compatibles de Storage, reconstruido Auth desde su fuente oficial verificada mediante SHA-256 con compilador y dependencias fijados, y sustituido el helper Go heredado de PostgreSQL por su-exec. El borrado del ejecutable se realiza en una capa independiente. La auditoría anterior a la migración pgx/v5 registró **un alto y cero críticos**, ambos totales del conjunto: el aviso alto está en Auth. Las otras ocho imágenes, incluido PostgreSQL, no presentan avisos altos/críticos. No se han ignorado avisos ni relajado el criterio de cierre. Evidencia: `evidence/phase-3/audit-2026-10-17.json`; conserva identificadores de imágenes, fechas e identificación de vulnerabilidades.

El aviso que bloqueaba Auth era CVE-2026-32286, en `github.com/jackc/pgproto3/v2 v2.3.3`. El [registro oficial de Go](https://pkg.go.dev/vuln/GO-2026-4518) indica que no hay una versión corregida conocida. Su explotación requiere que un servidor PostgreSQL malicioso o comprometido envíe una respuesta inválida. La red privada limita ese escenario, pero no elimina el aviso ni cambia el criterio de cierre. El [mantenedor](https://github.com/jackc/pgx/issues/2507) confirma que esa rama está fuera de mantenimiento. No se ha creado una bifurcación del protocolo ni una excepción en el escáner.

El 17/10/2026 se ha recuperado Docker Desktop del Mac. El motor no respondía pese a que la aplicación estaba abierta; la parada forzada mediante su CLI y un nuevo arranque recuperaron la máquina virtual. Se han conservado disco, volúmenes y secretos. El arranque real detectó cuotas de 0,005 CPU incompatibles con este Docker y sondas Node de Storage que competían con su proceso principal. Se han corregido las cuotas mínimas y redistribuido CPU entre PostgreSQL y Storage, manteniendo el total; la sonda usa el wget existente y conserva la misma comprobación HTTP.

Los nueve servicios están activos en el Mac, sin reinicios ni OOM al terminar la batería. Los doce grupos de integración local están superados, además de las comprobaciones de rutas, salud y recursos ficticios. Se mantiene separada la evidencia de CI (`isolation.json`) de la local (`local-isolation-2026-10-17.json`). Los diagnósticos de los fallos anteriores se conservan como historial, no como bloqueos actuales.

| Comprobación local del 17/10/2026 | Resultado | Evidencia |
|---|---|---|
| Motor Docker y arranque de datos/aplicación | Superada; nueve servicios activos | `local-runtime-2026-10-17.json`, `local-services-2026-10-17.log`, `local-app-2026-10-17.log` |
| Migración | Aplicada y confirmada | `local-migration-2026-10-17.log` |
| Dos cuentas, recuperación, RLS, archivos y concurrencia | Doce grupos superados | `local-isolation-2026-10-17.json` y `.log` |
| Rutas y PDF ficticios | Superada | `local-smoke-2026-10-17.log`, `local-assets-2026-10-17.log` |
| Presupuesto aplicado a contenedores | 3008 MiB y 1 CPU | `local-resources-2026-10-17.json`, `local-runtime-2026-10-17.json` |
| Interfaz servida por Docker | Comprobada visualmente | `local-access-2026-10-17.png` |

La repetición de Linux del 17/10 detectó una condición temporal en la última prueba de límite: reutilizaba una clave de acceso previa y podía cruzar su ventana de un minuto. La fixture se ha aislado con una dirección ficticia nueva y una ráfaga concurrente; exige exactamente cinco respuestas 401 y una 429, sin cambiar las reglas de Auth. La batería corregida vuelve a superar los doce grupos tanto en el Mac como en Linux (CI 39047620981).

Las evidencias de esta tabla están en `evidence/phase-3/`. Acceso local: `http://127.0.0.1:3000/acceso?lang=es`. Buzón de evaluación: `http://127.0.0.1:54324`; los correos no salen a Internet.

Los límites configurados suman 3008 MiB y 1 CPU para el conjunto. No son una medición de capacidad del VPS. La prueba de recursos y la comprobación de Control-Contracts-ATC corresponden a la fase 10.

## Reproducción y aceptación

El arranque, la migración y la batería de aislamiento se describen en `infra/supabase/README.md`. Los secretos se generan en `.secrets`, excluido de Git. No se deben regenerar contra una base existente ni ejecutar `down -v` para resolver un fallo de arranque.

La batería funcional está superada: 13 pruebas unitarias, 43 de PDF y 12 grupos de integración. La ejecución anterior de CI terminó en fallo exclusivamente por la auditoría de seguridad. La migración actual elimina localmente ese aviso; falta confirmar el conjunto en CI y obtener aceptación del usuario. El estado está registrado en `evidence/phase-3/status.json`. No se avanza a la fase 4.

## Prueba independiente de migración a pgx/v5 · 17/10/2026

La [imagen candidata](prueba-auth-pgx5.md) elimina la rama vulnerable y supera 57 pruebas Go y los 12 grupos de integración, con cero avisos altos o críticos en su auditoría final. Se han detenido sus ocho servicios conservando los volúmenes. El entorno habitual mantiene sus imágenes y fechas de arranque. Tras la aceptación del ensayo se ha incorporado la misma migración al target Auth habitual, con versión 2.197.0-be2-pgx5. La imagen local supera la auditoría sin altos/críticos. Una sesión y un borrador anteriores al cambio siguen siendo accesibles. Auth tiene ahora una sonda HTTP de salud y la pasarela espera su disponibilidad. La comprobación final del conjunto en CI AMD64 sigue pendiente; no se cierra todavía la fase 3.
