# Fase 3 · Acceso y aislamiento

En desarrollo. La fase 2 ha sido aceptada por el usuario. No se ha cerrado la fase 3 ni se ha intervenido en el VPS.

Implementación: SDK oficiales de Supabase fijados, sesiones de servidor en cookies HttpOnly/SameSite, comprobación remota de usuario confirmado y sesión activa, registro, confirmación explícita de enlace, acceso, reenvío, recuperación y cierre global de sesiones. El permiso de recuperación se vincula mediante HMAC al usuario y a su sesión.

La aplicación usa la clave anon exclusivamente en servidor y opera con el JWT del usuario; no utiliza la clave service_role para las operaciones documentales. Las tablas y Storage aplican RLS, y los cambios sensibles no están concedidos al rol authenticated. Las vistas y descargas son rutas autenticadas que comprueban propiedad y estado; no se generan enlaces firmados. La pasarela bloquea las rutas de publicación y firma.

El entorno local exclusivo incluye PostgreSQL, Auth, PostgREST y Storage sin transformación. Los correos de evaluación se capturan en Mailpit; no se envían a direcciones externas. El SMTP de Resend quedará pendiente de aportar el dominio remitente y sus secretos al preparar el despliegue.

Las migraciones y las pruebas de dos cuentas se ejecutarán en CI. Docker Desktop del Mac ha fallado antes de iniciar los servicios nuevos; el reinicio ha devuelto «Invalid virtual machine configuration. The storage device attachment is invalid». Se conserva el disco virtual y no se restablecen ni eliminan datos de Docker. La limitación se registrará en el cierre.

La primera integración Linux detectó un rol de Edge Functions que la configuración reducida no crea. Se retiró esa instrucción de la inicialización de contraseñas; se mantienen los roles de Auth, PostgREST y Storage. La CLI oficial 2.121.0 ofrece arranque nativo experimental, pero rechaza la configuración de plantillas de confirmación; no se adopta como sustituto del entorno de contenedores.
