# Fase 2 · Interfaz ES/CA

La interfaz permite recorrer la preparación de BRIE y CIE ELEC-1 con datos ficticios. Incluye entrada pública, presentación saltable, selección de modelo, edición, revisión de PDF de ejemplo, cierre simulado, documentos y recarga de KC simulada. Estado: comprobaciones superadas; pendiente de aceptación del usuario.

## Alcance entregado

Se conserva el branding aprobado, con geometría Bauhaus que gira al desplazarse y un pie accesible. El panel de acceso permanece fijo cuando cabe; en móvil y pantallas bajas vuelve al flujo de lectura. Inter y Plus Jakarta Sans se sirven desde la aplicación, con sus licencias OFL y procedencia en `evidence/phase-2/font-sources.json`.

Todos los mensajes esenciales tienen versión ES/CA. Cambiar de idioma conserva los datos de la sesión. El formulario de demostración contiene seis campos y señala ausencias y potencia inválida. Las propuestas de ejemplo conservan los cambios manuales, incluso los campos que se han vaciado. La revisión muestra el coste antes del cierre y la confirmación pide una acción explícita. Los ejemplos cerrados no se editan al volver atrás.

La navegación funciona con teclado, los errores se asocian a sus campos y los diálogos contienen el foco y lo devuelven al control de origen. Se ha inspeccionado la rama CSS de movimiento reducido; no se ha cambiado la preferencia del sistema del usuario, que estaba desactivada durante la prueba.

## Límites de esta entrega

Es una demo en memoria: al recargar se reinicia. El acceso no crea cuentas, las opciones de texto/voz/fotos cargan propuestas fijas y no acceden al micrófono ni a archivos. KC, recargas y correo son simulados; no hay pagos ni envíos.

La vista previa y descarga contienen ejemplos fijos aprobados en fase 0. Los cambios del formulario todavía no se trasladan al PDF; la interfaz lo advierte. `public/demo` contiene únicamente esos ejemplos ficticios, nunca documentos de cuentas. La autenticación y el aislamiento se implementarán en fase 3; los formularios completos y su generación PDF, en fases 4 y 5; créditos de servidor, IA y demás servicios siguen las fases acordadas.

## Pruebas y evidencias

| Prueba | Resultado | Evidencia |
|---|---|---|
| Formato, tipos, secretos y lógica de demo | Superada; 7 pruebas | `evidence/phase-2/check.log` |
| Construcción Next.js de producción | Superada | `evidence/phase-2/build.log` |
| Dependencias npm | 0 vulnerabilidades detectadas | `evidence/phase-2/npm-audit.json` |
| Recorrido ES/CA, errores, conservación de correcciones, cierre, recarga y documentos | Superada con datos ficticios | `evidence/phase-2/ui-checks.json` y capturas |
| Móvil 320/390, tablet 768 y escritorio 1440 px | Sin desbordamiento horizontal; tamaños emulados en navegador | Capturas `final-*`, `mobile-*`, `tablet-*`, `desktop-*` |
| Teclado, foco en errores, diálogo y retorno del foco | Superada | `evidence/phase-2/ui-checks.json` |
| Fuentes locales, panel fijo y pie accesible | Superada | `evidence/phase-2/ui-checks.json` |
| PDF e imágenes servidos frente a originales de prueba | 6 recursos idénticos por bytes | `evidence/phase-2/demo-assets.json` |
| Contenedor local y rutas de salud/privadas | Superada | `evidence/phase-2/docker-build.log`, `smoke.log` |
| CI: 7 pruebas de aplicación + 43 PDF, construcción de ambas imágenes, auditorías y demo | Superada; 0 vulnerabilidades altas/críticas detectadas en imágenes | `evidence/phase-2/ci-run.json`, `ci.log` |
| Revisión antes de publicar | APTO PARA COMMIT | `evidence/phase-2/pre-commit-review.md` |

Se corrigieron el desbordamiento decorativo móvil, el orden del foco en la revisión y el confinamiento/retorno del foco de los diálogos. No hay fallos funcionales abiertos en el alcance probado. Los tamaños móviles son emulados; no se afirma una prueba en dispositivos físicos. El test local del worker necesitó ejecutarse fuera del aislamiento que impide abrir puertos; pasó al habilitar el puerto local de prueba.

## Reproducción

Con Node 24, ejecutar `npm ci --ignore-scripts`, `npm run check` y `npm run build`. Para los contenedores, seguir los comandos de `infra/README.md` y ejecutar también `node scripts/check-demo-assets.mjs`. Las etiquetas locales `phase1` contienen la versión de código que se acaba de construir; se conservan por compatibilidad con los comandos de base técnica. La demo local está en http://127.0.0.1:3000. Elegir «Probar con 10 KC», saltar la presentación, escoger BRIE o CIE, cargar el ejemplo completo y revisar el PDF. Validar muestra el coste simulado y permite descargar el ejemplo. Cambiar ES/CA desde la cabecera en cualquier pantalla.

No se ha desplegado esta fase en el VPS. La prueba de recursos y convivencia con Control-Contracts-ATC sigue correspondiendo a la fase 10.

La [ejecución de CI](https://github.com/FranMore68/BoletinExpress/actions/runs/38903385648) terminó correctamente sobre el commit `86e00d8502b6ae3f020bc9a1def1f88ecd3ddb4e`. Los commits posteriores de cierre contienen únicamente documentación y evidencias. Los 55 registros favorables de interfaz incluyen capturas repetidas y comprobaciones del recorrido; no equivalen a 55 pruebas unitarias distintas. La consola del contenedor no registró avisos ni errores durante la comprobación final (`browser-console.json`). El arranque por Compose quedó esperando en Docker Desktop; se completó con `docker start boletinexpress-evaluation-web-1` y ambos contenedores quedaron saludables (`containers.json`). En CI, Compose terminó normalmente.
