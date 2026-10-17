# Revisión previa a publicación de fase 4

Alcance: diff completo respecto a f6b6b26; perfil, editor BRIE, rutas privadas, migración, cola, worker PDF, visor, dependencias y CI. Sin despliegue ni cambios en otras aplicaciones.

## Hallazgos

- No quedan hallazgos altos, críticos o medios abiertos en el alcance revisado.
- Se corrigieron los permisos por defecto de las funciones públicas de Supabase: la cola y la finalización de trabajos se reservan al rol `boletin_worker`. La prueba directa desde un cliente autenticado y `function-acl.csv` verifican la denegación.
- Se sustituyó el error SQL `40001` por `PT409` para evitar reintentos indefinidos de PostgREST en conflictos de revisión. Las pruebas verifican el conflicto sin sobrescritura.
- El visor nativo embebido se sustituyó por PDF.js local después de observar una vista vacía. Se mantiene `X-Frame-Options: DENY` y la ruta privada conserva las comprobaciones de sesión, propietario y revisión.

## Correcciones rápidas

Las correcciones anteriores están aplicadas y comprobadas. Sin acciones pendientes de esta revisión. Las nuevas dependencias están fijadas; npm no informa vulnerabilidades. Trivy local de web y worker no informa HIGH/CRITICAL. CI 39056454726 ha auditado las nueve imágenes sin HIGH/CRITICAL. El arranque limpio y los 20 grupos de integración también están superados.

Riesgo: cambio aditivo local, con migración transaccional y datos ficticios; el despliegue en VPS sigue fuera de esta fase. La prueba del worker pausa únicamente el contenedor del proyecto y reanuda en `finally`; no modifica el reloj global.

APTO PARA COMMIT
