# Revisión previa a publicar — fase 7

Alcance: panel ES/CA, tres rutas privadas, reserva y aplicación transaccional, RLS de fuentes, worker OpenAI y CI. Sin dependencias añadidas y sin cambios al VPS.

Hallazgos: no se han detectado problemas altos o críticos en la revisión del código. Observaciones bajas: el reconocimiento exige revisión humana; `store:false` no excluye toda retención del proveedor; el acceso amplio a capacidades de modelos fue configurado por el usuario tras comprobar las restricciones disponibles. Los modelos y el destino HTTPS están fijados en el servidor, sin herramientas externas.

Comprobaciones: identidad y estado en cada operación; rol exclusivo de reserva; bloqueo por cuenta/documento; límites calculados en servidor; UUID y hash estables; protección de campos editados/vaciados; aplicación vinculada a revisión; ruta privada sin firma reutilizable; borrado de trabajos y fuentes al cerrar; cuotas conservadas sin contenido. Los logs no imprimen claves, documentos ni respuestas. La prueba real del CIE separa las poblaciones de titular e instalación y deja un NIF contradictorio sin aplicar. La prueba de micrófono denegado muestra las alternativas por texto y archivo. La foto original queda fuera del repositorio.

Correcciones realizadas: optimización local de fotografías para respetar los 2 MiB de Storage, protección adicional de potencia sin unidad y de «Todo OK», impedir edición durante la aplicación de propuestas y cuotas ancladas al día UTC real y sondeo secuencial sin acumulación de peticiones.

Riesgo: piloto local con información ficticia y revisión obligatoria; instalación limpia y análisis de imágenes superados. CI 39153558098 sobre fe685375f39cf1cca6187d9fa308f45794eddd07: 37 pruebas de aplicación, 43 PDF, 267 casos de catálogo, 79 grupos de integración y diez imágenes sin avisos altos/críticos detectados. El inventario de PostgREST/Haskell mantiene la limitación conocida de cobertura. Un 503 local previo no se ha reproducido en la batería final y queda registrado.

APTO CON OBSERVACIONES
