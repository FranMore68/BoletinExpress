# Pruebas PDF de la fase 0

Prototipo local separado de la futura aplicación. No utiliza servicios, cuentas, claves ni datos reales. Los servidores temporales escuchan solo en `127.0.0.1` y el navegador de pruebas bloquea destinos externos.

## Requisitos

- Node >=22.13, npm y Google Chrome. Para otra ubicación de Chrome, definir `CHROME_PATH`.
- Poppler (`pdftoppm`) para la comparación visual.
- Python con Pillow, pypdf, pdfplumber y lxml para las verificaciones y referencias; son herramientas de QA, no dependencias de producción.

## Ejecutar desde la raíz del proyecto

La ruta actual del CIE escribe sobre la conversión estática aportada por el usuario. Sus muestras y límites se explican en [el cierre técnico](../../docs/fase-0-cierre.md). Los bloques se desplazan según el flujo XFA contrastado en Adobe. La aceptación del usuario sigue pendiente.

```sh
cd tools/pdf-phase0
npm ci --ignore-scripts --omit=optional
npm audit --audit-level=high
npm run inventory
npm test
npm run generate:brie
npm run generate:cie
python3 verify_cie.py
```

Las siguientes pruebas conservan el diagnóstico de la ruta XFA descartada:

```sh
npm run probe:xfa
npm run probe:variants
```

`probe:variants` devuelve código 1 porque el JavaScript XFA no se ejecuta. Se conserva como diagnóstico histórico. La puerta actual comprueba la generación estática, su lectura independiente y la fidelidad visual frente al original desplegado.

Para conservar el resultado unitario:

```sh
node --test --test-reporter=tap test/*.test.mjs > ../../evidence/phase-0/unit-tests.tap
npm audit --json > ../../evidence/phase-0/npm-audit.json
```

Para reproducir la comparación de imagen:

```sh
pdftoppm -scale-to 1600 -png ../../plantillas/Plta_ButlletiReconeixementBT.pdf ../../evidence/phase-0/brie-original-poppler
pdftoppm -scale-to 1600 -png ../../output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf ../../evidence/phase-0/brie-filled-poppler
python3 verify_pixels.py
npm run gate
```

En este equipo se ha usado el Python incluido en Codex:

```sh
/Users/francescmore/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 verify_pixels.py
```

`gate` devuelve código 1 mientras no se haya verificado la colocación de los campos condicionales con referencias de Adobe. Un código 0 solo indica que la evidencia técnica guardada es favorable; seguiría pendiente la aceptación del usuario. No sustituye una ejecución reciente de los comandos ni modifica el estado del proyecto.

## Archivos

- `inventory.mjs` y `source.mjs`: huellas de originales e inventario XFA con rutas completas, opciones y scripts.
- `brie-layout.mjs`, `brie.mjs`: 59 campos del BRIE; rechazan datos desconocidos y texto que no cabe. No aplican reglas de certificación técnica.
- `brie-fixture.json`: ejemplo ficticio reproducible; 58 campos se rellenan y la tensión del defecto 3 queda vacía porque ese defecto se marca No. Ese campo se comprueba aparte.
- `probe-xfa.mjs`, `probe-variants.mjs`: exportación base y ocho pruebas condicionales del CIE. No ejecutan el JavaScript incrustado en el PDF.
- `render-static.mjs`: utilidad auxiliar para inspección y extracción de texto con PDF.js. La aceptación visual del BRIE utiliza Poppler.
- `verify_pixels.py`: exige cero píxeles cambiados fuera de las zonas de relleno, con margen de dos píxeles para el antialiasing.
- `cie-layout.json`, `cie.mjs`: mapa de 70 campos lógicos, generación CIE estática, rechazo de datos incompatibles y texto que no cabe. `cie-flow.mjs` conserva y desplaza los vectores del fondo original.
- `cie-fixtures.mjs`, `generate-cie.mjs`: once muestras ficticias, incluidas ocho ramas, P1 + Auditori y un borrador incompleto.
- `compare_cie_references.py`: cobertura de los 14 usos y posición estable de usos y Sí/No en 19 referencias del usuario; requiere pdfplumber como herramienta de QA.
- `verify_cie.py`: reabre los once PDF con pypdf, verifica el texto y compara sus veintidós páginas con Poppler. Requiere pypdf y Pillow.

PDF.js 6.4.299 está fijado en el lockfile. Se descartó la versión 5.6.205 del entorno por GHSA-hq66-cqwq-w95j. La fuente Liberation Sans se obtiene del paquete PDF.js y se incrusta en el BRIE; su licencia está en `node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION`.

La revisión visual registrada en `visual-review.json` es una comprobación humana/asistida: solo debe cambiar tras inspeccionar las páginas correspondientes. No se cambia automáticamente para hacer pasar la puerta de fase.

La referencia XFA oficial está preservada en `evidence/phase-0/sources/ELEC1-oficial-original.pdf`. `templates.cieWorking` identifica el archivo de trabajo del usuario y no se sobrescribe. La revisión de estructura compara sus paquetes XFA, no sustituye su huella sin comprobar los cambios.

`derive-cie-references.py` crea tres copias diagnósticas desde el XFA Auditori, cambiando solo su paquete de formulario. Conserva la plantilla y los datasets. Las selecciones no activas se fuerzan a 0 para evitar heredar P1 de los datasets. No se entregan como certificados ni como originales independientes. Abrirlas en Adobe para repetir la comparación visual.

```sh
python3 derive-cie-references.py
```

La revisión visual se vincula por SHA-256 a los once PDF. Si se regeneran y cambia su huella, `gate` exige volver a revisarlos; no actualizar las huellas sin inspección. `placementApproved: false` indica que falta la aceptación del usuario; no impide registrar una comprobación técnica favorable.
