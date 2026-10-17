# Revisión del ajuste local de cuotas CPU

Alcance: únicamente las tres cuotas cambiadas en `infra/supabase/compose.yaml`. Revisión con pre-commit-security-review. El conjunto de fase 3 conserva el bloqueo de seguridad de Auth descrito en su informe general.

Hallazgo corregido: Docker Desktop 29.6.1/arm64 rechazó las cuotas de correo y plantillas (0,005 CPU; `cpu.max: invalid argument`). Se suben ambas a 0,01 CPU y se reduce PostgreSQL de 0,12 a 0,11 CPU. No se cambian imágenes, permisos, redes, credenciales, políticas RLS ni esquemas.

Validación: Compose resuelve las configuraciones; la suma comprobada sigue siendo 3008 MiB y 1 CPU (`local-resources-2026-10-17.json`). Las cuotas individuales ya no están por debajo de 0,01 CPU. El arranque local completo y las pruebas se registrarán por separado.

No se identifican hallazgos de seguridad nuevos en este diff. La corrección no aprueba el cierre de fase ni un despliegue.

Corrección recomendada: conservar este reparto compatible y comprobar el arranque completo.

Riesgo: redistribución mínima de CPU dentro del mismo presupuesto; sin cambios en datos ni acceso.

APTO PARA COMMIT
