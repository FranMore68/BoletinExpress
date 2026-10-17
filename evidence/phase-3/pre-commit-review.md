# Revisión de fase 3 tras migrar Auth a pgx/v5

Alcance: acceso y aislamiento, esquema/RLS, almacenamiento, contenedores, migración pgx/v5, reenvío, pruebas y evidencias. Fuente verificada: e09bdd19dbb61084b246a025a3739113f4c0c99b. Revisión aplicada con pre-commit-security-review. Este veredicto no autoriza fases futuras ni el despliegue del VPS.

## Hallazgos

Sin hallazgos altos o críticos pendientes en el alcance implementado. CI 39052031663 pasa en Linux AMD64: auditorías npm, tipos, compilaciones, 13 pruebas de aplicación, 43 de PDF, 57 pruebas principales Go y 12 grupos de integración. Las nueve imágenes presentan cero altos y cero críticos, sin exclusiones de vulnerabilidades. La imagen local de Auth también pasa y sus capas coinciden con el informe local.

El aviso anterior CVE-2026-32286 se resuelve eliminando las bibliotecas antiguas. Pop y pgx/v5 se fijan con manifiestos y checksums; se adaptan dos importaciones del error PostgreSQL. La construcción rechaza módulos antiguos en el árbol y el binario. No se mantiene un parche propio del protocolo. El informe previo se conserva en pre-commit-review-before-pgx5-2026-10-17.md.

Observación baja resuelta: la comprobación inicial de continuidad se adelantó al arranque. Auth dispone ahora de sonda HTTP y la pasarela espera su salud; la sesión y el borrador anteriores sobreviven a la promoción.

## Seguridad y funcionamiento

Comprobaciones de usuario confirmado, sesión activa, propietario y estado en cada operación. RLS y rutas privadas rechazan accesos cruzados, JWT caducados/revocados y cookies manipuladas. El usuario no puede asignar propietario, estado o saldo ni modificar directamente filas u objetos. No se entregan enlaces públicos o firmados reutilizables. La recuperación requiere prueba firmada, temporal y vinculada a la sesión. Origen, tamaños y tipos se validan en servidor; cookies HttpOnly/SameSite/Secure en HTTPS, respuestas privadas no cacheables.

La aplicación usa anon+JWT, sin service_role ni administrador de base. Los secretos se excluyen de Git y del contexto Docker. El inicializador candidato emplea claves, red y volúmenes propios, permisos 0700/0600 y no sobrescribe una configuración existente. Las pruebas publicadas utilizan cuentas/documentos ficticios y no muestran credenciales. Los correos se capturan localmente. El enlace del buzón solo se configura en Compose local y se abre con noopener/noreferrer.

No hay cambios nuevos del esquema ni relajación de autorización. Se conserva la base y se ha comprobado continuidad tras actualizar Auth. Hay una imagen anterior para reversión local. Nueve servicios sin OOM/reinicios; cuotas conjuntas conservadas en 3008 MiB y 1 CPU. La capacidad del VPS queda para fase 10; no se ha modificado el VPS.

## Correcciones recomendadas

Ninguna bloqueante para cerrar técnicamente la fase 3. Mantener el cierre pendiente de aceptación humana y el perfil reutilizable/formulario BRIE en fase 4.

Riesgo: bajo en el entorno de evaluación y en las funciones verificadas; la preparación del despliegue y las funciones futuras conservan sus propias pruebas y cierres.

APTO PARA COMMIT
