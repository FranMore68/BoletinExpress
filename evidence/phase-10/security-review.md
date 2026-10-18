# Revisión previa a publicación · 19/10/2026

Alcance: configuración Coolify, empaquetado de migraciones existentes, generador
de secretos separado, workflow manual de imágenes, observador de capacidad y
actualización de estado. No cambia la lógica de negocio ni los SQL existentes.

## Hallazgos

- Medio, despliegue pendiente: Coolify 4.4.6 inyecta `.env` en cada contenedor.
  Corregido en el Compose local con anulaciones explícitas de claves innecesarias con el marcador fijo `disabled`.
  Diez contenedores locales con inyección simulada comprobados. El recurso remoto
  conserva los 107 marcadores tras recargar, está detenido y sin secretos. Antes
  de arrancar falta cargar variables y comprobar el entorno efectivo remoto.
  No apto aún para activar el piloto.
- Medio, despliegue pendiente: el parser añade la red exclusiva del UUID a todos
  los componentes. No conecta otros proyectos, pero la separación frontal/interna
  del archivo fuente no es la topología completa. Verificar aislamiento remoto y
  que solo web tenga ruta pública antes de habilitarla.
- Bajo: GHCR y la descarga privada desde Coolify no están configurados todavía.
  El workflow es manual y exige CI correcta del mismo commit antes de construir;
  bloquea la publicación de imágenes si el análisis detecta HIGH/CRITICAL.
- Bajo: los resultados de Trivy de las imágenes de esta revisión llegarán con CI
  y release. No se reutiliza el resultado de fase 7 como análisis de imágenes nuevas.

## Comprobaciones

- Sin cambios en dependencias, autenticación de aplicación ni esquema SQL.
- Instalación nueva local: siete migraciones aplicadas, repetición sin reaplicarlas,
  nueve servicios activos, auxiliar finalizado con salida 0 y endpoints HTTP 200.
- Los límites efectivos de contenedores se conservan en `local-startup.json`.
- Credenciales remotas nuevas en `.secrets/coolify.env`, permisos 0600, creación
  exclusiva sin sobrescritura. El generador no modifica archivos locales existentes.
- Proveedores desactivados con valores ficticios en las pruebas auxiliares.
- `.dockerignore` incorpora únicamente SQL existentes y el script de migración.
  No incorpora `.secrets`, fuentes documentales de usuario ni evidencias.
- El workflow usa acciones fijadas por commit, ref main, token limitado al repositorio,
  login por stdin y logout; no permite interpolar entradas libres en comandos.
- El migrador se conecta únicamente a postgres del recurso, sin socket Docker ni
  acceso al host; SQL transaccionales y registro de versiones existentes.
- Entornos auxiliares locales detenidos, sin modificar servicios preexistentes.
- Publicación de código autorizada; activación pública y carga de secretos remotos
  pendientes. No se ha modificado ningún otro proyecto del VPS.

## Correcciones y condiciones siguientes

Conservar las anulaciones de claves al guardar el Compose final. Revisar el archivo
generado por Coolify y comprobar variables efectivas sin imprimir valores. Confirmar
privacidad de paquetes, descarga con configuración Docker temporal y secreto
propio del webhook Stripe de pruebas. No añadir un login global a Coolify.
Completar CI, análisis de imágenes y recorrido remoto antes de aceptar la fase.

Riesgo: el código y la configuración pueden versionarse; el despliegue permanece
bloqueado por condiciones operativas aún no verificadas.


El cargador valida el ámbito de las nueve imágenes antes de pedir credenciales,
rechaza repositorios ajenos y exige Linux x86_64. Pruebas con manifiesto ficticio
válido y repositorio ajeno: superadas, sin red ni credenciales. Las diez entradas
Compose tienen pull_policy never. Descarga real y arranque remoto pendientes.

APTO CON OBSERVACIONES
