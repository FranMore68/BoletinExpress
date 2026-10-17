# Reenvío de confirmación en evaluación local

Fecha: 17 de octubre de 2026.

El reenvío produce un segundo mensaje en Mailpit. El entorno local no entrega mensajes a buzones personales. La interfaz anterior decía «Revisa tu correo» sin explicar este destino.

Se añade una explicación en español y catalán y un enlace al buzón de pruebas http://127.0.0.1:54324. La URL se configura mediante LOCAL_MAILBOX_URL únicamente en compose.auth.yaml; sin esa variable no aparece el aviso. El puerto de Mailpit continúa limitado al equipo local.

La prueba de aislamiento ahora registra dos cuentas ficticias, solicita un reenvío, exige un mensaje nuevo y confirma con el enlace de ese mensaje. También conserva la comprobación de que abrir la página no consume el enlace y de que no puede confirmarse dos veces.

El reenvío corresponde a cuentas que aún no han confirmado su correo. La entrega a correo externo sigue pendiente de la configuración SMTP del despliegue.

Evidencias: evidence/phase-3/local-resend-2026-10-17.json, su registro .log y local-resend-screen-2026-10-17.png. No cambia el bloqueo de seguridad previo de la fase 3.
