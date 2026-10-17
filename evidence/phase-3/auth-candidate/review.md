# Revisión de la prueba independiente de migración

Alcance: Dockerfile y manifiestos de auth-candidate, las dos importaciones adaptadas durante su construcción, pruebas Go adicionales, inicializador aislado y parámetros de evidencias/clave de prueba del ejecutor de integración.

No se han encontrado hallazgos altos o críticos nuevos. No se modifican el target Auth habitual, sus credenciales, sus volúmenes, las políticas de autorización ni sus servicios. Se fijan fuente, compilador y dependencias. El ejecutable y su árbol de módulos excluyen las cuatro bibliotecas antiguas comprobadas. El análisis Trivy final no presenta avisos altos o críticos y sus capas coinciden con la imagen ensayada.

El inicializador escribe las claves únicamente en el directorio excluido .secrets/auth-candidate, con directorio 0700 y archivos 0600, sin mostrarlas. Se niega a sobrescribir una configuración existente. Los puertos mantienen enlace exclusivo a 127.0.0.1. Las ocho instancias candidatas se han detenido y sus volúmenes se conservan.

La actualización de Pop puede afectar rutas adicionales de Auth. Para este piloto se han verificado 57 pruebas principales de crypto/configuración/utilidades y los 12 grupos de integración aplicables a las funciones implementadas. Las funciones externas no incluidas en el piloto no quedan acreditadas por esta prueba. Linux AMD64 de CI y la promoción al entorno habitual siguen pendientes.

No requiere migraciones nuevas del esquema de la aplicación. El SQL existente se aplicó solo a la base candidata nueva. No se han solicitado ni enviado mensajes externos. No se modificó el VPS.

Riesgo: bajo para conservar esta prueba independiente, pendiente de validación adicional antes de promoverla. El aviso alto del Auth original permanece abierto; este veredicto no aprueba el cierre de la fase 3.

APTO PARA COMMIT
