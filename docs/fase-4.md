# Fase 4: perfil profesional y BRIE manual

Estado: pruebas locales superadas; comprobación limpia en CI pendiente. La fase 5 requiere la aceptación del usuario.

## Resultado

«Mi perfil» guarda por cuenta los datos de empresa e instalador. Cada BRIE nuevo recibe una copia de los campos aplicables, incluidos los de la declaración de la segunda página. Cambiar el perfil solo afecta a documentos nuevos. Corregir o vaciar un campo del borrador no modifica el perfil. No se guardan firmas ni se inventan datos técnicos.

El editor ES/CA incluye los 59 campos del inventario aprobado. Permite guardar, reabrir, corregir y generar una vista previa privada de las dos páginas. Los campos vacíos permanecen vacíos; la lista de ausencias ayuda a revisarlos sin inventar requisitos normativos. Un texto que no cabe se señala por campo y bloquea ese PDF, sin recortarlo. «No» y cero se conservan.

PDF.js 6.4.299 muestra las páginas dentro de la aplicación, con su worker alojado localmente. La ruta del PDF exige sesión y propiedad, comprueba la revisión antes y después de leer Storage, y no permite caché ni enlaces públicos. Guardar una corrección invalida la vista previa anterior. La plantilla y la fuente son privadas y tienen huellas verificadas; el generador compartido conserva el diseño oficial probado en fase 0.

## Cola y seguridad

La migración `002-brie.sql` se aplica una sola vez y conserva los datos existentes. Perfil y borradores usan control de revisión para evitar sobrescrituras entre pestañas. Los conflictos devuelven `PT409`: no se emplea `40001`, que PostgREST puede reintentar indefinidamente.

La cola PostgreSQL deduplica por documento/revisión. El worker procesa un trabajo simultáneo, con concesión de 120 segundos e identificador de intento. Recupera concesiones caducadas, rechaza resultados antiguos y reintenta fallos transitorios hasta tres intentos. Las versiones obsoletas se limpian. Su credencial solo permite las funciones y objetos de trabajo necesarios; no recibe `service_role` ni la clave de firma JWT. Las funciones nuevas revocan expresamente los privilegios por defecto de Supabase antes de conceder el permiso previsto.

Los PDF de evaluación no validan instalaciones ni consumen KC. CIE manual, cobro y conservación temporal siguen en sus fases previstas. El VPS y Control-Contracts-ATC no se han modificado.

## Pruebas y evidencias

| Prueba | Resultado | Evidencia |
|---|---|---|
| Lint, tipos, dominio, traducciones y secretos | 17 pruebas superadas | `evidence/phase-4/check.log` |
| Regresión del generador de fase 0 | 43 pruebas superadas | `evidence/phase-4/pdf-tests.log` |
| Dos páginas completas e incompletas | Inspección visual realizada; contenido ficticio correcto | `brie-completo.pdf`, `brie-incompleto.pdf`, `pdf-verification.json`, `render/` |
| Diseño fuera de las zonas de escritura | Cero píxeles cambiados en las cuatro páginas | `pixel-verification.json` |
| Perfil, aislamiento, concurrencia, datos incompletos, errores de ajuste y recuperación | 8 grupos superados | `integration.json`, `integration.log` |
| Escritorio, tablet, móvil y teclado ES/CA | Superado | Capturas y `ui.json` |
| Dependencias e imágenes | npm sin vulnerabilidades; web y worker sin HIGH/CRITICAL; nueve imágenes pendientes de CI | Informes de auditoría y CI |

## Reproducción

Con el entorno de acceso local ya preparado:

```sh
npm ci --ignore-scripts
npm run check
npm run build
sh scripts/apply-access.sh
node scripts/init-worker-key.mjs
docker build --target web -t boletinexpress-web:phase1 .
docker build --target worker -t boletinexpress-worker:phase1 .
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait
node scripts/test-isolation.mjs
node scripts/test-phase4.mjs
```

El script de credencial del worker conserva la existente y escribe `.secrets/worker.env` con permisos 0600. No compartir ese archivo. La credencial de evaluación vence al año; su renovación debe conservar el rol restringido y no regenerar las claves base del entorno.

Para verificar la fidelidad visual, renderizar originales y resultados con Poppler a 110 dpi y ejecutar `scripts/verify-phase4-pdf.py`. Las evidencias de ejemplo contienen exclusivamente datos ficticios. El informe de CI registrará el commit de código probado.

## Fallos pendientes

Sin fallos locales pendientes. Falta confirmar CI y la aceptación del usuario. No iniciar la fase 5 hasta aceptar esta fase.
