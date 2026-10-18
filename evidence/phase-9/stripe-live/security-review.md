# Revisión previa a publicar — Stripe en pruebas

Alcance: retirada del parámetro obsoleto de Checkout, comprobaciones de parámetros, CLI aislado, helper local, CI y evidencias. No hay cambios de esquema ni de permisos de saldo.

## Hallazgos

- Bajo: el listener local guarda credenciales en archivos privados y en el entorno del contenedor. Son accesibles al administrador de Docker, igual que los secretos actuales. No hay puertos publicados ni registro de su salida; no se despliega al VPS.
- Bajo: el binario oficial macOS presenta avisos altos en su inventario. No se ejecutó ni recibió credenciales. Se utiliza una compilación distinta con Go y módulos corregidos, verificaciones y pruebas oficiales; su imagen Linux tiene cero avisos altos/críticos detectados.
- Bajo: Checkout muestra los métodos habilitados en Stripe. La API vigente rechaza payment_method_types; se retira ese parámetro y se conservan importes, cantidad, propietario, modo de pruebas y validación del webhook.

## Correcciones y evidencia

Versiones y checksums fijados, usuario sin privilegios, filesystem de solo lectura, sin capacidades, límites de recursos y logs desactivados. La clave solo se entrega por archivo privado. El helper limita la retirada al proyecto/servicio previstos y restaura la configuración normal. No se registran tarjetas ni eventos completos. El detector de secretos pasa.

Pruebas locales: 33 de aplicación y 16 grupos de pagos; ambos packs aprobados con Stripe real en sandbox, rechazo, cancelación y caducidad; dos eventos reales repetidos localmente sin nuevos abonos. Saldo final 43 KC con dos recargas de 10 y 25. CI final pendiente de ejecución sobre este cambio.

Riesgo: evaluación local en modo de pruebas; el VPS y otros proyectos no cambian.

APTO CON OBSERVACIONES
