# Fase 5: CIE ELEC-1 manual

Estado: cierre técnico completado el 18/10/2026; aceptado por el usuario mediante «ok vamos con la fase 6». La fase 4 fue aceptada el 17/10/2026 mediante «vamos con la fase 5». Se autoriza comenzar la fase 6.

## Resultado

El editor privado ES/CA permite aportar los 70 campos del CIE, guardar revisiones, reabrir, corregir y revisar el PDF de dos páginas. La interfaz traduce las etiquetas y opciones; el PDF conserva los textos oficiales en catalán. No se añaden mediciones, decisiones normativas ni firmas. La generación es una vista previa y no consume KC.

Las opciones largas se muestran completas bajo el selector, con descripción accesible, también en móvil.

El formulario muestra las ramas de ampliación/modificación y 50 %, P1/P2, detalles de usos g/h, otros usos y otra tensión. El CUPS se excluye en instalación nueva, como indica el modelo. Cambiar una selección conserva sus valores localmente mientras no se guarde; el aviso explica que las ramas que dejan de aplicar se excluyen del borrador guardado y del PDF. Volver a la selección anterior antes de guardar permite recuperarlos.

Los datos técnicos distinguen los comunes, instalaciones de enlace, generación y suministro complementario. Se conservan las unidades del modelo: aislamiento en MΩ, tierra en Ω e intensidad del IGA en A. No se reinterpretan las fórmulas ni los criterios escritos en las opciones oficiales.

«Mi perfil» ofrece listas oficiales para el tipo de vía y la categoría, con sus etiquetas ES/CA. Las entradas anteriores se conservan y pueden corregirse expresamente.

El perfil copia 18 campos aplicables al nuevo CIE, incluida la repetición del nombre en la declaración. El NIF de empresa y el DNI del instalador se mapean a sus campos respectivos; el NIF adicional del BRIE no se confunde con el DNI. No se modifica el perfil al corregir un documento. Cambiarlo solo afecta a documentos nuevos. Si un perfil antiguo contiene un código postal o una opción incompatible con el CIE, se conserva su valor y se pide corregirlo expresamente.

## PDF y seguridad

Se reutilizan el fondo estático y el flujo vectorial aprobados en la fase 0. La plantilla privada se verifica por SHA-256 y los originales se conservan. Las opciones del formulario y las restricciones SQL se contrastan con el inventario de 70 campos. Los valores de selección siguen siendo los oficiales, aunque la interfaz los muestre traducidos.

La migración aditiva `003-cie.sql` amplía la cola existente con el tipo documental y añade el guardado y encolado CIE. No recrea tablas, volúmenes ni credenciales. Las funciones de perfil/creación mantienen el control de sesión y propiedad; el guardado utiliza revisión y `PT409` para conflictos. La validación SQL también rechaza opciones, ramas y códigos postales incorrectos en llamadas directas.

BRIE y CIE comparten un worker y un único trabajo pesado simultáneo. Las funciones de cola conservan sus nombres históricos `*_brie_*` para mantener compatibilidad con la fase 4; operan sobre la cola compartida y el tipo elige el adaptador. El rol restringido del worker conserva sus permisos; no recibe una clave administrativa. Las rutas de vista previa comprueban sesión, propietario y revisión, no permiten caché y no publican enlaces firmados o públicos.

## Pruebas y evidencias

| Prueba | Resultado | Evidencia en `evidence/phase-5` |
|---|---|---|
| Código, tipos, traducciones, contrato SQL y secretos | 22 pruebas de aplicación | `check.log` |
| Regresión PDF de fase 0 | 43 pruebas superadas | `pdf-tests.log` |
| Opciones completas y combinaciones del catálogo | 267 casos sin recortes ni solapamientos | `catalog.json`, `catalog.log` |
| Perfil, correcciones, ramas, RLS, PDF privado, errores y compatibilidad BRIE | 8 grupos superados en local y CI | `integration.json`, `integration.log` |
| Once variantes del CIE generadas por el worker | Dos páginas por variante | `variants.json`, `variants/` |
| Relectura de texto, vectores de origen y píxeles fuera de campos | 11 casos, 22 páginas; cero píxeles fuera de campos | `pdf-verification.json`, `render/` |
| Interfaz ES/CA, teclado, escritorio, tablet y móvil | Superada, con selecciones largas completas y reutilización del perfil | `ui.json`, capturas |
| Regresión de acceso/BRIE y auditorías desde cero | 28 grupos de integración; nueve imágenes sin HIGH/CRITICAL | `ci-summary.json` |

La comparación de píxeles se hace contra el fondo recompuesto de cada variante. La fidelidad de los desplazamientos y saltos de página se apoya en las referencias XFA/Adobe aceptadas en la fase 0; no se afirma igualdad de píxeles entre motores distintos.

## Reproducción

Con Node 24 y el entorno local de acceso existente:

```sh
npm ci --ignore-scripts
npm run check
npm test --prefix tools/pdf-phase0
node scripts/test-cie-catalog.mjs
sh scripts/apply-access.sh
node scripts/init-worker-key.mjs
docker build --target web -t boletinexpress-web:phase1 .
docker build --target worker -t boletinexpress-worker:phase1 .
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait
node scripts/test-phase5.mjs
python3 scripts/verify-phase5-pdf.py
```

`verify-phase5-pdf.py` requiere pypdf, Pillow y Poppler; `PDFTOPPM` permite indicar la ruta de este último. No se modifica el reloj del equipo ni el del VPS. Las cuentas y documentos de estas pruebas son ficticios.

Para probar el producto: recargar `http://127.0.0.1:3000/cuenta?lang=es`, revisar «Mi perfil», crear un CIE ELEC-1, elegir actuación/requisitos/uso y completar sus datos. Guardar y generar la vista previa; corregir obliga a generar otra revisión. El cambio a CA conserva los datos.

## Pendientes

Sin fallos funcionales o de seguridad abiertos en el alcance verificado. CI y las pruebas locales están superados. Aceptación recibida; se inicia la fase 6. No no se cobra KC y no se despliega en el VPS. Control-Contracts-ATC permanece fuera del alcance de los cambios.

## Revisión previa a publicación

El alcance se ha revisado mediante `pre-commit-security-review`: sin hallazgos altos o críticos de código, migración aplicada localmente sin recrear datos y permisos efectivos registrados en `function-acl.csv`. El informe completo está en `security-review.md`. La auditoría de nueve imágenes ha terminado sin HIGH/CRITICAL.

## CI y entorno final

La ejecución [39059593840](https://github.com/FranMore68/BoletinExpress/actions/runs/39059593840) ha superado la instalación desde cero, las migraciones, las 22 pruebas de aplicación, 43 pruebas PDF, 267 casos de catálogo y 28 grupos de integración del commit `4d844a0ef914c3b8feec7e1ddfbd2530beb32238`. Los resultados originales y las nueve auditorías están conservados en `evidence/phase-5/ci/`.

El primer pipeline fue sustituido al incorporar las listas del perfil. El resultado válido del cierre es la ejecución anterior, correspondiente al código final. Los avisos de GitHub sobre el runtime de una acción fijada y el cambio anunciado de `ubuntu-latest` no han causado fallos; se mantienen como observaciones de mantenimiento del entorno de CI.

El frontal temporal de comprobación visual está detenido. La aplicación principal permanece en `http://127.0.0.1:3000`. Las pruebas de capacidad del VPS y los cobros pertenecen a sus fases posteriores.
