# Revisión del arranque local de Storage

Alcance: cambios adicionales en `infra/supabase/compose.yaml`, con pre-commit-security-review. El aviso alto de Auth sigue documentado y bloquea el cierre de la fase.

Hallazgos corregidos: bajo la cuota de 0,04 CPU, las sondas Node de Storage agotaban sus cinco segundos y competían con el proceso principal. La imagen ya incluye wget; la nueva sonda consulta el mismo `/status`, con el mismo criterio HTTP de disponibilidad, sin añadir dependencias. Una captura de arranque registró Storage al 3,82 % de CPU y PostgreSQL al 0,01 %. Se mueve 0,06 CPU de PostgreSQL (0,11 → 0,05) a Storage (0,04 → 0,10).

Se mantienen 3008 MiB y 1 CPU totales, redes privadas, puertos loopback, permisos, secretos y datos. No se modifican imágenes, migraciones ni políticas de acceso. La medición local de arranque no es la prueba de capacidad del VPS de fase 10.

La validación final debe comprobar disponibilidad de todos los servicios y los doce grupos de aislamiento; se conserva el mismo límite de espera de 240 segundos.

No se identifican hallazgos altos/críticos nuevos en este diff. Riesgo: redistribución limitada de CPU para evitar el bloqueo del arranque y una sonda HTTP más ligera, sin debilitar su criterio.

APTO PARA COMMIT
