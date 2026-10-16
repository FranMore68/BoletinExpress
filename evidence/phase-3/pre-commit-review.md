# Revisión de fase 3

Alcance: implementación de acceso y aislamiento, esquema/RLS, Storage, contenedores y cambios de integración. Aplicada la skill pre-commit-security-review. Este informe evalúa el conjunto para su cierre y promoción; los commits privados de diagnóstico y corrección no constituyen una aprobación de despliegue.

## Hallazgos

- **Alto, Auth:** el análisis de la imagen corregida conserva CVE-2026-32286 en `github.com/jackc/pgproto3/v2 v2.3.3`. El registro oficial de Go indica que no hay una versión corregida conocida. Requiere respuestas de un PostgreSQL malicioso o comprometido; mantenerlo en red privada reduce exposición, pero no resuelve el aviso. El plan aceptado impide cerrar la fase con avisos altos/críticos.
- **PostgreSQL corregido:** retirado el helper Go heredado y sustituido por su-exec 0.3-r0 mediante un script compatible. La eliminación se separa en una capa propia. La auditoría final ya no muestra las 23 entradas anteriores.
- **Integración superada:** corregida una llamada de la batería que pasaba texto a assert.match en lugar de RegExp. Los 12 grupos de integración han pasado en CI 38948859820.
- **Limitación local:** Docker Desktop no arranca el disco virtual del Mac. La interfaz funciona con Node y la integración se comprueba en Linux temporal; no se han borrado datos ni volúmenes para eludir el fallo.

## Comprobaciones de la revisión

Las operaciones comprueban identidad confirmada, sesión activa, propietario y estado. RLS restringe tablas y objetos; no se permite al usuario asignar propietario, estado o saldo. Las rutas de vista y descarga están autenticadas, sin enlaces públicos/firmados. El permiso de recuperación está firmado, caduca y está vinculado a usuario y sesión. Se comprueban origen, formato JSON y límites de cuerpo. Las cookies son HttpOnly/SameSite y las respuestas privadas no se almacenan en caché.

La aplicación no utiliza service_role ni credenciales de base de datos. Secretos excluidos de Git y del contexto de construcción; los diagnósticos no incluyen correos, contraseñas ni documentos. La migración se ejecuta por consola administrativa y se registra para evitar su repetición. Las imágenes se construyen fuera del VPS. Los límites conjuntos configurados son 3008 MiB y 1 CPU; falta medir capacidad en fase 10.

## Correcciones recomendadas

La auditoría final de las nueve imágenes está completa: ocho sin altos/críticos y Auth con un alto. Resolver el aviso residual mediante una actualización mantenida de Auth o evaluar por separado una alternativa; no introducir automáticamente una bifurcación del protocolo PostgreSQL ni una exclusión del escáner. Mantener la fase abierta y sin despliegue con el criterio actual.

Riesgo: el acceso está implementado, pero el conjunto conserva un aviso alto conocido y no está aprobado para promoción.

NO APTO PARA COMMIT
