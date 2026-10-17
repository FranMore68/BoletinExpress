# Fase 4: perfil profesional y BRIE manual

Estado: aceptada por el usuario el 17/10/2026 mediante «vamos con la fase 5». CI y pruebas locales superadas. Se autoriza comenzar la fase 5.

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
| Regresión de acceso de fase 3 | 12 grupos superados en local y CI | `access-regression.json`, `access-regression.log` |
| Lint, tipos, dominio, traducciones y secretos | 17 pruebas superadas | `evidence/phase-4/check.log` |
| Regresión del generador de fase 0 | 43 pruebas superadas | `evidence/phase-4/pdf-tests.log` |
| Dos páginas completas e incompletas | Inspección visual realizada; contenido ficticio correcto | `brie-completo.pdf`, `brie-incompleto.pdf`, `pdf-verification.json`, `render/` |
| Diseño fuera de las zonas de escritura | Cero píxeles cambiados en las cuatro páginas | `pixel-verification.json` |
| Perfil, aislamiento, concurrencia, datos incompletos, errores de ajuste y recuperación | 8 grupos superados en local y CI | `integration.json`, `integration.log` |
| Escritorio, tablet, móvil y teclado ES/CA | Superado | Capturas y `ui.json` |
| Revisión previa a publicación | APTO PARA COMMIT; permisos y conflictos corregidos y verificados | `security-review.md`, `function-acl.csv` |
| Dependencias e imágenes | npm sin vulnerabilidades; nueve imágenes sin HIGH/CRITICAL en CI | Informes de auditoría y CI |

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

Para verificar la fidelidad visual, renderizar originales y resultados con Poppler a 110 dpi y ejecutar `scripts/verify-phase4-pdf.py`. Las evidencias de ejemplo contienen exclusivamente datos ficticios. CI [39056454726](https://github.com/FranMore68/BoletinExpress/actions/runs/39056454726) ha probado el commit `3bbfdd3c1ce1671d6a4b5adde513e72ced0a7aa4` desde un entorno limpio. Los informes originales de nueve imágenes y las dos baterías de integración están conservados en `evidence/phase-4/ci/`. El resumen está en `ci-summary.json`.

## Fallos pendientes

Sin fallos funcionales o de seguridad pendientes en el alcance de fase 4. Aceptación recibida; la fase 5 está autorizada.

## Comprobación del usuario

1. Acceder a `http://127.0.0.1:3000/cuenta?lang=es` con una cuenta de evaluación.
2. Entrar en «Mi perfil» y guardar datos ficticios de empresa e instalador.
3. Crear un BRIE, comprobar los datos copiados y completar o corregir sus campos.
4. Guardar y generar la vista previa. Revisar las dos páginas; corregir obliga a guardar y generar otra revisión.
5. Cambiar a CA para revisar el mismo recorrido en catalán.

La generación de esta fase es una vista previa de evaluación. La validación y el descuento de KC se incorporarán en la fase 6.

## Observaciones de mantenimiento

GitHub informa de la ejecución de una acción fijada que declara Node 20 usando Node 24 y del próximo cambio de imagen `ubuntu-latest`. No han causado fallos ni alertas altas/críticas. Se conservan como avisos del entorno de CI; no son vulnerabilidades abiertas de la aplicación.

La comprobación local confirma nueve servicios activos, sin OOM ni reinicios, con límites conjuntos de 3008 MiB y 1 CPU. Esto no sustituye la prueba de capacidad del VPS prevista en fase 10. El frontal temporal de pruebas visuales está detenido.
