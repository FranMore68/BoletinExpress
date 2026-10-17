# Revisión del acceso al buzón local

Alcance: aviso ES/CA en acceso, enlace al Mailpit local y prueba de reenvío incorporada a la batería de aislamiento.

Sin hallazgos de seguridad nuevos en este cambio. La URL se configura únicamente en Compose local, desde el servidor, y el enlace abre con `noopener noreferrer`. No cambia SMTP, autenticación, permisos, dependencias ni esquema. No se incorpora ningún secreto al cliente. El buzón conserva su puerto limitado a 127.0.0.1.

La prueba utiliza cuentas ficticias y exige un segundo mensaje distinto antes de consumir el enlace reenviado. Mantiene la comprobación de que abrir la página no consume el enlace y de que confirmar dos veces falla.

Riesgo bajo, limitado a información y navegación en el entorno local. El bloqueo previo de la fase 3 por CVE-2026-32286 sigue pendiente; esta revisión solo cubre este cambio.

APTO PARA COMMIT
