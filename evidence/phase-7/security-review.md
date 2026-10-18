# Revisión previa a publicar — fase 7

Alcance: panel ES/CA, tres rutas privadas, reserva y aplicación transaccional, RLS de fuentes, worker OpenAI y CI. Sin dependencias añadidas y sin cambios al VPS.

Hallazgos: no se han detectado problemas altos o críticos en la revisión del código. Observaciones bajas: el reconocimiento exige revisión humana; `store:false` no excluye toda retención del proveedor; el acceso amplio a capacidades de modelos fue configurado por el usuario tras comprobar las restricciones disponibles. Los modelos y el destino HTTPS están fijados en el servidor, sin herramientas externas.

Comprobaciones: identidad y estado en cada operación; rol exclusivo de reserva; bloqueo por cuenta/documento; límites calculados en servidor; UUID y hash estables; protección de campos editados/vaciados; aplicación vinculada a revisión; ruta privada sin firma reutilizable; borrado de trabajos y fuentes al cerrar; cuotas conservadas sin contenido. Los logs no imprimen claves, documentos ni respuestas. La foto original queda fuera del repositorio.

Correcciones realizadas: optimización local de fotografías para respetar los 2 MiB de Storage, protección adicional de potencia sin unidad y de «Todo OK», impedir edición durante la aplicación de propuestas y cuotas ancladas al día UTC real.

Riesgo: piloto local con información ficticia y revisión obligatoria; pendiente de resultados finales de instalación limpia y análisis de imágenes antes del cierre.

APTO CON OBSERVACIONES
