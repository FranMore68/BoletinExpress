# Revisión previa a publicación: fase 5

Alcance: diff completo respecto a 5a583a0. Contrato CIE, formulario compartido, rutas privadas, migración 003, adaptador PDF, selección de adaptador en worker, herramientas de prueba y CI. No modifica servicios del VPS.

## Hallazgos

- Sin hallazgos altos o críticos detectados en el código revisado. Se mantienen sesión, origen, propietario y revisión en las operaciones; el rol del worker no amplía su acceso.
- La migración añade funciones con `search_path` vacío y revoca expresamente los permisos por defecto de Supabase para `public`, `anon`, `authenticated` y `service_role` antes de conceder solo la ejecución prevista. La validación de campos, códigos postales y ramas también se aplica en SQL.
- El nuevo editor excluye ramas antiguas solo al guardar, con aviso previo, y conserva los valores locales para volver atrás antes del guardado. La generación no se habilita con opciones o códigos postales incompatibles.
- Las plantillas originales se conservan. Se comprueba la huella del fondo y la identidad del mapa frente a fase 0. El worker solo elige entre dos adaptadores y rutas fijas; no recibe rutas ni código del usuario.
- La revisión de secretos contempla archivos renombrados/eliminados: omite los que ya no existen y sigue comprobando nombres y contenido de los archivos publicables.

## Correcciones y comprobaciones

Se corrigieron las etiquetas de aislamiento, IGA y potencia contra el PDF oficial antes de publicar. Las pruebas detectaron identificadores ficticios demasiado largos para BRIE; la prueba de compatibilidad utiliza ahora identificadores breves y distintos, manteniendo por separado el ensayo de texto que no cabe. Hubo un timeout local de registro durante el primer arranque; se conserva el intento en `registration-timeout.log` y se exige repetir la batería completa.

Sin dependencias nuevas: se reutilizan pdf-lib, fontkit y PDF.js fijados. Han pasado 22 pruebas de aplicación, 43 de regresión PDF, 267 casos de catálogo y los ocho grupos de integración CIE en local. La repetición completa resuelve el intento inicial de registro y la prueba con identificadores excesivos. Las auditorías de nueve imágenes en CI siguen siendo condición para cerrar la fase.

Riesgo: ampliación aditiva del piloto con datos ficticios, verificación de ambas rutas documentales y ausencia de cambios en producción.

APTO PARA COMMIT
