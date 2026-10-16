# Supabase exclusivo de evaluación

Este Compose es un conjunto reducido de desarrollo: PostgreSQL, Auth, PostgREST, Storage privado y una pasarela interna. Omite Realtime, Functions, Analytics, Studio y transformación de imágenes. Mailpit captura mensajes y el servicio `templates` entrega las plantillas a Auth. Ningún mensaje sale a Internet con la configuración local.

La configuración parte del conjunto oficial `self-hosted/v0.8.2`, con versiones fijadas y actualización de servicios tras detectar avisos: PostgreSQL 17.11.0.004, Auth 2.197.0, Storage 1.83.5 y Mailpit 1.31.6. La imagen de Storage retira los gestores npm/yarn, que no se usan en ejecución. Su auditoría determina si se puede cerrar la fase. `roles.sql` se adapta a los tres roles utilizados; omite los de los servicios ausentes. La imagen de PostgreSQL incorpora el archivo con COPY, sin montar carpetas externas. La migración de aplicación se ejecuta con `supabase_admin`, exclusivamente por la consola local del contenedor. La aplicación web utiliza solo anon + JWT de usuario y nunca ese administrador ni service_role.

## Arranque reproducible

Desde la raíz, con Node 24 y Docker en funcionamiento:

```sh
node scripts/init-local-auth.mjs
docker build --target database -t boletinexpress-postgres:phase3 .
docker build --target storage -t boletinexpress-storage:phase3 .
docker build --target auth -t boletinexpress-auth:phase3 .
docker build --target gateway -t boletinexpress-gateway:phase3 .
docker build --target templates -t boletinexpress-templates:phase3 .
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml up --detach
sh scripts/apply-access.sh
docker build --target web -t boletinexpress-web:phase1 .
docker build --target worker -t boletinexpress-worker:phase1 .
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait
node scripts/test-isolation.mjs
```

La inicialización conserva una configuración existente en `.secrets`; no volver a generar las claves de una base existente. La migración aplicada se registra y las siguientes ejecuciones la omiten. Las etiquetas locales de web y worker conservan el nombre `phase1` por compatibilidad; se construyen con el código actual.

Acceso: http://127.0.0.1:3000/acceso. Buzón de evaluación: http://127.0.0.1:54324. El puerto de pasarela 54321 y el del buzón están ligados a loopback; no se publican PostgreSQL, Auth, REST ni Storage individualmente. En el despliegue se retirarán los puertos de diagnóstico y Mailpit, y se configurará Resend SMTP con secretos de Coolify y remitente verificado. Los enlaces de confirmación no se consumen con GET: la persona pulsa el botón en la aplicación. No se incluyen contraseñas ni tokens en los registros de prueba.

## Recursos y datos

Los límites del conjunto de datos suman 2240 MiB y 0,25 CPU, incluidos pasarela, plantillas y buzón. Junto con web/worker: 3008 MiB y 1 CPU. Son límites configurados; no sustituyen la prueba del VPS de fase 10. Los volúmenes tienen nombres exclusivos `boletinexpress-*`. `docker compose down` detiene los servicios conservando los volúmenes. No ejecutar `down -v` ni borrar los volúmenes para resolver un fallo de arranque: eliminaría datos de evaluación.

La retención, limpieza de reservas incompletas, créditos y formularios completos se incorporarán en sus fases. Las rutas documentales de fase 3 admiten borradores privados y PDF ficticios de prueba, con cinco archivos de hasta 2 MB. El contenido no se envía a IA.

En el Mac actual, Docker Desktop no puede arrancar su disco virtual; la interfaz puede servirse con Node y las pruebas completas se realizan en el Linux temporal de CI. El diagnóstico está en `evidence/phase-3/docker-diagnosis.log`. No se ha eliminado ni restablecido ese disco. La alternativa nativa experimental de CLI 2.121.0 se descartó porque no admite servir nuestras plantillas de correo.
