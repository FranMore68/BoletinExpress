# Fase 0 Fidelidad de los documentos PDF

> Estado posterior: [cierre técnico del 16/10/2026](fase-0-cierre.md). Las limitaciones y cifras siguientes conservan el diagnóstico anterior a las correcciones de flujo.

**Actualización 16/10/2026:** la ruta estática ya genera un CIE y sus ocho variantes con pruebas funcionales superadas. Queda pendiente contrastar las posiciones de los campos condicionales con el original desplegado. Véanse [resultados y muestras actuales](fase-0-cie-estatico.md). El informe siguiente conserva el diagnóstico histórico de PDF.js/XFA del 15/10/2026.

Fecha: 15/10/2026. Estado: **BLOQUEADA. No procede pasar a la fase 1.**

Se ha implementado un prototipo local de generación BRIE, inventario del CIE XFA y pruebas reproducibles de sus variantes. El BRIE supera las comprobaciones realizadas. La conversión actual del CIE no conserva toda la presentación ni su comportamiento condicional. Los originales permanecen intactos.

## Resultado de las pruebas

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Pruebas unitarias del generador y protección de originales | 17 superadas, 0 fallidas | [TAP](../evidence/phase-0/unit-tests.tap) |
| Campos BRIE inventariados | 59; 58 rellenados en el ejemplo y uno condicional probado aparte | [Mapa y operaciones](../evidence/phase-0/brie-placement.json) |
| Conservación de las dos páginas y medidas del BRIE | Superada | TAP y revisión visual |
| Cambios fuera de las zonas de relleno del BRIE | 0 píxeles en ambas páginas | [Comparación](../evidence/phase-0/brie-pixel-verification.json) |
| Texto excesivo, opción desconocida, tipos incorrectos y campos ausentes | Superadas; sin recorte ni datos inventados | TAP |
| Dependencias instaladas | 0 vulnerabilidades conocidas en npm audit | [Auditoría](../evidence/phase-0/npm-audit.json) |
| Apertura XFA del CIE con PDF.js 6.4.299 | Genera dos páginas y 68 controles DOM | [Diagnóstico](../evidence/phase-0/cie-probe.json) |
| Campos y código del CIE inventariados | 77 campos y 13 bloques de código | [Inventario](../evidence/phase-0/inventory.json) |
| Variantes condicionales del CIE | 0 superadas, 8 fallidas | [Detalle](../evidence/phase-0/cie-variants.json) |
| Fidelidad visual CIE respecto a Adobe | Fallida | [Revisión](../evidence/phase-0/visual-review.json) |

La comparación de píxeles del BRIE enmascara únicamente las zonas donde se escribe, con dos píxeles adicionales de margen. No certifica la corrección eléctrica ni sustituye las pruebas con más valores que corresponderán a la fase del formulario.

## Fallos pendientes del ELEC-1

La prueba de integración utiliza los controles XFA de PDF.js y mantiene desactivada la evaluación de código del documento. Al cambiar las opciones se conserva su valor en el control, pero no se ejecutan los eventos que muestran otros campos:

| Caso | Resultado observado |
|---|---|
| Ampliación | No aparece la pregunta de superar el 50 % |
| Modificación o reforma | No aparece la pregunta de superar el 50 % |
| Clase P1 | No aparece su clasificación |
| Clase P2 | No aparece su clasificación |
| Uso g | No aparece su subclasificación |
| Uso h | No aparece su subclasificación |
| Otros usos | No aparece el campo de especificación |
| Otra tensión | El campo permanece invisible |

Además, la salida base presenta una tipografía diferente de Adobe, pierde las divisiones internas de los códigos postales y no calcula los números de página. Se corrigió la escala de impresión de puntos PDF a píxeles CSS; esos fallos persisten. No se ha generado un CIE completo que pueda considerarse aprobado.

Las 77 entradas incluyen los campos técnicos, dos contadores de página y una firma. Los nombres repetidos, como `NomCognoms`, se distinguen por su ruta completa. No se deducen reglas técnicas ni obligatoriedad normativa de los scripts.

## Evidencias visuales

- BRIE generado: [página 1](../evidence/phase-0/brie-filled-poppler-1.png), [página 2](../evidence/phase-0/brie-filled-poppler-2.png).
- Referencia Adobe del CIE: [página 1](../evidence/phase-0/adobe-cie-page1.png), [página 2](../evidence/phase-0/adobe-cie-page2.png).
- Conversión PDF.js del CIE: [página 1](../evidence/phase-0/cie-pdfjs-page1.png), [página 2](../evidence/phase-0/cie-pdfjs-page2.png).
- [PDF CIE de diagnóstico NO APTO](../evidence/phase-0/CIE-PDFjs-base-NO-APTO.pdf). Solo sirve para examinar los fallos.
- [BRIE con datos ficticios](../output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf). No tiene firmas ni acredita una instalación.

La referencia Adobe se obtuvo abriendo el original sin guardarlo. No se dispone de una exportación estática de Adobe: Acrobat rechazó la impresión porque no hay impresora instalada. No se modificó la configuración del equipo para sortearlo.

## Seguridad y conservación de originales

Se consultó el [aviso oficial de PDF.js](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j): la versión 5.6.205 incluida en el entorno está en la serie afectada; se instaló 6.4.299 desde npm y se guardó la auditoría del conjunto de dependencias utilizado. Los scripts de instalación y los paquetes opcionales se omitieron.

La prueba utiliza un perfil temporal de Chrome, servidor de bucle local, destinos externos bloqueados y CSP. No hay servicios expuestos ni claves de otros proyectos. Las huellas SHA-256 comprobadas antes y después son:

| Original | SHA-256 |
|---|---|
| BRIE | `5cc739303306d37a35a0b4912c6e7b6240d141e8ae251c4dc1d604e086eb2b64` |
| ELEC-1 | `f846613f63196b0c2a2b343a64650e6e95a808d06a8ab7c5c1681f9b7d4ca19a` |

## Condición para desbloquear

Recomiendo buscar primero una versión oficial estática equivalente, verificando que coincide con este modelo y cubre sus variantes. Si no existe, habrá que resolver la preparación de variantes XFA y la tipografía con una referencia estática de Adobe, o evaluar un motor compatible antes de asumir un coste. La existencia de un PDF que se abre no permite cerrar esta fase.

No se reconstruirá el diseño, se sustituirá el original ni se contratará una herramienta comercial automáticamente. La fase se cerrará cuando las ocho pruebas condicionales funcionen, la comparación con Adobe sea favorable, exista un caso CIE completo verificado y el usuario acepte el resultado. La base Git, la aplicación y el despliegue continúan pendientes en las fases siguientes.
