# Prueba independiente de Auth con pgx/v5

Fecha: 17/10/2026. Esta prueba no sustituye el Auth habitual ni cierra la fase 3.

## Cambio probado

Se conserva Supabase Auth v2.197.0 y se construye una imagen experimental `boletinexpress-auth:pgx5-candidate` con:

- Pop actualizado de v6.1.1 a v6.4.1, que utiliza pgx/v5.
- pgx/v5 fijado en v5.11.0.
- Dos importaciones cambiadas de `github.com/jackc/pgconn` a `github.com/jackc/pgx/v5/pgconn`: el tratamiento de errores PostgreSQL y su prueba de hooks.
- Las actualizaciones de x/net y gRPC ya utilizadas en la imagen habitual.
- go.mod y go.sum guardados para fijar todas las dependencias de la candidata.

No se modifica el código del protocolo. La construcción falla si el árbol de módulos o el ejecutable siguen incorporando pgproto3/v2, pgconn antiguo, pgx/v4 o pgtype antiguo. Dos pruebas adicionales comprueban el rechazo de longitudes negativas o truncadas en DataRow y la conservación de errores PostgreSQL envueltos con pgx/v5.

Fuentes oficiales: [Pop v6.4.1](https://github.com/gobuffalo/pop/releases/tag/v6.4.1), [dependencias de Pop](https://github.com/gobuffalo/pop/blob/v6.4.1/go.mod), [diagnóstico del mantenedor del protocolo](https://github.com/jackc/pgx/issues/2507).

## Aislamiento

Proyecto de Compose: `boletinexpress-auth-candidate`. Ocho servicios: web, PostgreSQL, Auth, REST, Storage, gateway, plantillas y buzón. No se ejecuta otro worker, que no interviene en esta prueba.

Se generan claves nuevas en `.secrets/auth-candidate`, con permisos restringidos. La prueba no utiliza las credenciales de `.secrets/app.env` ni `.secrets/supabase.env`. Tiene red y volúmenes exclusivos. Puertos de bucle local: 3010, 54331 y 54334. Las pruebas HTTP utilizan sus propios almacenes de cookies y direcciones ficticias.

Antes y después se comparan imagen y fecha de arranque de los contenedores habituales web, Auth y PostgreSQL. También se comprueba que no comparten red ni volúmenes con los candidatos. No se ejecuta `down -v`, no se retiran datos y no se modifica el VPS.

El ejecutor de integración admite `AUTH_TEST_DATA_ENV` y `AUTH_TEST_REPORT_DIR` para firmar el JWT caducado con la clave de prueba correcta y mantener separados los informes.

## Reproducción local

Desde la raíz, con Docker operativo y las imágenes de datos y web de la fase 3 disponibles:

```sh
docker build -f infra/supabase/auth-candidate/Dockerfile -t boletinexpress-auth:pgx5-candidate .
python3 scripts/init-auth-candidate.py
docker compose -f .secrets/auth-candidate/compose.json up --detach --wait --wait-timeout 240
# Solo para el primer arranque de la base candidata:
docker compose -f .secrets/auth-candidate/compose.json exec -T postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < infra/supabase/001-access.sql
AUTH_TEST_ENV=.secrets/auth-candidate/app.env \
AUTH_TEST_DATA_ENV=.secrets/auth-candidate/supabase.env \
AUTH_TEST_REPORT_DIR=evidence/phase-3/auth-candidate \
AUTH_TEST_MAILBOX=http://127.0.0.1:54334 \
node scripts/test-isolation.mjs
```

El inicializador conserva una configuración existente y se niega a sobrescribirla. En posteriores arranques se reutiliza su compose.json y no se vuelve a aplicar el SQL inicial.

Auditoría, sin excepciones de vulnerabilidades:

```sh
docker tag boletinexpress-auth:pgx5-candidate boletinexpress-auth-candidate:phase1
BE_SCAN_REPORT_DIR=evidence/phase-3/auth-candidate \
BE_SCAN_SERVICES=auth-candidate sh scripts/scan-images.sh
```

Detener exclusivamente la prueba, conservando sus datos:

```sh
docker compose -f .secrets/auth-candidate/compose.json stop
```

## Criterio de incorporación

El resultado de esta prueba debe revisarse antes de cambiar el target Auth habitual. Tras incorporarlo habrá que repetir las comprobaciones de CI y la auditoría del conjunto, y solicitar la aceptación del cierre de la fase 3. Esta prueba de CPU ARM no acredita por sí sola la ejecución Linux AMD64 de CI ni la capacidad del VPS.

Las evidencias están en `evidence/phase-3/auth-candidate/`. El informe resumido `status.json` identifica la imagen exacta y los resultados de la prueba.

## Resultado del ensayo

| Prueba | Resultado | Evidencia |
|---|---|---|
| Construcción con dependencias fijadas y verificación de módulos | Superada | `build-locked.log`, `modules.txt` |
| Ausencia de la rama antigua en el ejecutable | Superada | `binary-modules.txt` |
| Crypto, configuración, utilidades y dos regresiones de migración | 57 pruebas principales superadas | `build-locked.log` |
| Acceso, reenvío, recuperación, sesiones, RLS y Storage con dos cuentas | 12 grupos superados | `isolation.json`, `isolation.log` |
| Auditoría de la imagen final | 0 avisos altos y 0 críticos, sin exclusiones | `image-auth-candidate.json`, `scan-locked.log` |
| Correspondencia entre imagen ensayada y auditada | Capas idénticas; el índice OCI y su configuración se registran por separado | `status.json` |
| Entorno habitual conservado | Mismas imágenes y fechas de arranque de web, Auth y PostgreSQL | `runtime-isolation.json`, verificación final en `status.json` |
| Recursos de la prueba | Ocho servicios detenidos; volúmenes conservados | `stop.log`, `status.json` |

**Resultado: prueba superada; candidata todavía no incorporada al entorno habitual.** No se han ejecutado todavía las comprobaciones de CI de esta candidata en Linux AMD64. El aviso del Auth habitual y el cierre de la fase 3 permanecen pendientes hasta incorporar y verificar el cambio.
