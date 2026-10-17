# Revisión previa a publicación: fase 6

Alcance: diff completo respecto a e6c0678. Migración 004, saldo y movimientos, comprobante de revisión, validación y PDF final privados, limpieza del worker, interfaz ES/CA, claves restringidas y pruebas/CI. No modifica el VPS.

## Hallazgos por severidad

- Sin hallazgos altos o críticos detectados en el cambio revisado. Las operaciones exigen sesión confirmada y activa, propietario, origen propio, revisión y SHA-256. El precio procede del tipo documental en SQL, nunca del cliente.
- Observación: Storage conserva 30 avisos moderados de dependencias transitivas ya existentes; aplicación y worker no notifican vulnerabilidades. No se añaden ni cambian dependencias. La auditoría de las nueve imágenes debe verificarse en CI antes del cierre de fase.
- Observación operativa: ocho peticiones HTTP simultáneas alcanzaron el plazo de Auth con las cuotas iniciales. Se devuelve 503 recuperable, se han redistribuido las cuotas conservando 1 CPU y se prueban por separado ocho transacciones reales con un solo cargo, el doble clic HTTP y tres CIE que compiten por 10 KC. La prueba de capacidad de dos usuarios en el VPS sigue perteneciendo a fase 10.

## Correcciones y comprobaciones

La migración usa funciones con search_path vacío, revoca permisos predeterminados y concede la validación únicamente al rol restringido del servidor. El rol no puede escribir tablas, crear documentos ni conceder créditos. Los clientes y el worker no pueden ejecutar la validación. Las tablas y los objetos privados mantienen RLS con sesión y propietario.

La transacción mantiene el orden cuenta→documento, un movimiento por documento y saldo no negativo. La concesión de bienvenida es idempotente y se ejecuta después de confirmar el correo. Las pruebas verifican permisos reales, saldo, reintentos, cambio de revisión, hash incorrecto, coste inventado y saldo insuficiente.

El cierre conserva el objeto PDF inmutable que se revisó, borra los datos de trabajo y retira el acceso a las fuentes. La cola de limpieza no puede borrar el PDF final. El alta de objetos toma un bloqueo compartido sobre el borrador para serializarse con la validación y evitar fuentes tardías. No se modifican plantillas ni adaptadores PDF.

Se corrige la clasificación de fallos temporales de Auth para no presentarlos como sesión caducada. El editor no vuelve a mostrarse como editable si refrescar la cuenta falla después de confirmar el cierre. La casilla de revisión tiene tamaño propio y etiqueta clicable para no heredar el ancho de los campos de texto.

Las claves quedan en .secrets, excluidas de Git, sin introducir claves administrativas en el frontal. El verificador de secretos, formato, tipos, 24 pruebas de aplicación, 43 pruebas PDF y 267 casos del catálogo han pasado. La batería final de créditos verifica 11 grupos. No hay cambios destructivos en volúmenes ni credenciales existentes.

Riesgo: cambio aditivo del piloto con datos ficticios; quedan observaciones de dependencias moderadas y capacidad, documentadas y sujetas a los hitos previstos.

APTO CON OBSERVACIONES
