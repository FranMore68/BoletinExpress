# Fase 3 · Acceso y aislamiento

Estado: implementada y verificada funcionalmente; abierta por un aviso alto de seguridad en Auth. La fase 2 está aceptada. No se ha intervenido en el VPS.

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
| Auditoría de las nueve imágenes | Completa: ocho sin altos/críticos; Auth conserva un alto y cero críticos | `evidence/phase-3/audit-final.json` |

La [integración final](https://github.com/FranMore68/BoletinExpress/actions/runs/38948859820) se ejecuta en el Linux temporal de GitHub Actions con dos cuentas ficticias distintas, credenciales aleatorias que no se conservan y un PDF de ejemplo. Comprueba propiedad también con llamadas directas a RLS/Storage, vistas y descargas, cookies manipuladas, sesiones revocadas y caducadas, concurrencia y límites de acceso. El archivo `isolation.json` confirma `pass: true`, `complete: true` y doce grupos superados. Se han preservado los registros de fallos anteriores, separados del resultado final.

## Correcciones comprobadas y pendientes

Se han corregido el rol authenticated que Auth todavía usa al crear usuarios, el prefijo pkce_ de los hashes de correo y la selección de un solo registro en las funciones de creación y reserva. La migración se ejecuta por consola con supabase_admin; la aplicación no utiliza ese administrador. Se han añadido comprobaciones de disponibilidad de Storage y pasarela para no iniciar las pruebas mientras los procesos aún arrancan. La auditoría elimina cada archivo temporal tras analizar su imagen.

La auditoría inicial registró 218 avisos altos/críticos. La actualización de servicios oficiales redujo el resultado a 59 altos. Se han actualizado dependencias compatibles de Storage, reconstruido Auth desde su fuente oficial verificada mediante SHA-256 con compilador y dependencias fijados, y sustituido el helper Go heredado de PostgreSQL por su-exec. El borrado del ejecutable se realiza en una capa independiente. La auditoría final completa registra **un alto y cero críticos**, ambos totales del conjunto: el aviso alto está en Auth. Las otras ocho imágenes, incluido PostgreSQL, no presentan avisos altos/críticos. No se han ignorado avisos ni relajado el criterio de cierre. Evidencia: `evidence/phase-3/audit-final.json`; conserva identificadores de imágenes, fechas e identificación de vulnerabilidades.

El aviso residual de Auth es CVE-2026-32286, en `github.com/jackc/pgproto3/v2 v2.3.3`. El [registro oficial de Go](https://pkg.go.dev/vuln/GO-2026-4518) indica que no hay una versión corregida conocida. Su explotación requiere que un servidor PostgreSQL malicioso o comprometido envíe una respuesta inválida. La red privada limita ese escenario, pero no elimina el aviso ni cambia el criterio de cierre. El [mantenedor](https://github.com/jackc/pgx/issues/2507) confirma que esa rama está fuera de mantenimiento. No se ha creado una bifurcación del protocolo ni una excepción en el escáner.

Docker Desktop del Mac falla al iniciar su disco virtual: «Invalid virtual machine configuration. The storage device attachment is invalid». Se conserva el disco y sus volúmenes. La interfaz funciona mediante Node; el acceso completo local queda pendiente de recuperar Docker. La CLI nativa experimental se descartó porque no admite nuestras plantillas de correo. Evidencias: `docker-diagnosis.log`, `docker-restart.log` y `native-assessment.json` en `evidence/phase-3`.

Los límites configurados suman 3008 MiB y 1 CPU para el conjunto. No son una medición de capacidad del VPS. La prueba de recursos y la comprobación de Control-Contracts-ATC corresponden a la fase 10.

## Reproducción y aceptación

El arranque, la migración y la batería de aislamiento se describen en `infra/supabase/README.md`. Los secretos se generan en `.secrets`, excluido de Git. No se deben regenerar contra una base existente ni ejecutar `down -v` para resolver un fallo de arranque.

La batería funcional está superada: 13 pruebas unitarias, 43 de PDF y 12 grupos de integración. La ejecución de CI termina en fallo exclusivamente por la auditoría de seguridad, no por un fallo funcional. La fase no se cierra hasta resolver el aviso alto según el plan aceptado y obtener aceptación del usuario. El estado está registrado en `evidence/phase-3/status.json`. No se avanza a la fase 4.
