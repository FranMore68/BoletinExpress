# Revisión de activación general de correo

Alcance: worker/mail.mjs, configuración de Compose, script reversible de secretos, mensajes ES/CA y pruebas respecto de f8e0b07.

Hallazgos:
- Medio, configuración exclusiva del piloto: Mailpit conserva copias de los enlaces de Auth y no es un almacén de producción. Su API solo se publica en loopback; la fase 10 debe revisar el envío y la conservación antes de habilitarlo remotamente. No se admite documentación real.
- Bajo, SMTP no garantiza deduplicación exactamente una vez ante una interrupción después de aceptar el mensaje. No afecta al saldo. Los documentos mantienen su idempotencia por trabajo en la API de Resend.
- Bajo, la fase 9 sigue pendiente de credenciales y de pruebas externas; no se declara cerrada a partir de respuestas simuladas.

Comprobaciones: clave fuera de Git y del contexto Docker; TLS verificado y sin modo inseguro; .invalid bloqueado en el relay y desviado al buzón local en el worker solo en evaluación; ruta local restringida a hosts conocidos y sin credenciales en la URL. El remitente con nombre visible se separa correctamente en Mailpit. El script no sobreescribe otro SMTP y permite volver a la configuración anterior. No hay dependencias ni migraciones nuevas. Se mantienen 3008 MiB y 1 CPU; registro real tras el ajuste de cuota completado. 33 pruebas unitarias y 12+12 regresiones locales superadas; dos imágenes modificadas analizadas sin avisos altos ni críticos detectados. Recepción de correos y PDF confirmada por el usuario.

Corrección rápida pendiente: configurar Stripe en modo pruebas para cerrar la fase 9. El envío local de evaluación ya está activo y comprobado.

Riesgo: acotado al piloto local con datos ficticios y correo de evaluación; requiere revisión del despliegue en fase 10.

APTO CON OBSERVACIONES
