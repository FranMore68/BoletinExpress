# Fase 0: cierre técnico para revisión

Fecha: 16/10/2026. Estado: **aceptada por el usuario el 16/10/2026** mediante «Ok» a la propuesta de cierre e inicio de fase 1.

El archivo `Plta_ELEC1CertificatInstalElectricaBTauditori.pdf` sí ha servido: contiene el estado XFA guardado con P1 y g3 Auditori. Su plantilla coincide byte a byte con la oficial. Adobe muestra el detalle P1 debajo de los botones y el detalle g al inicio de la segunda página. Se han corregido ambos desplazamientos.

## Entregables

- [BRIE completo ficticio](../output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf), dos páginas.
- [CIE completo con P1 + Auditori](../output/pdf/phase-0/cie-variantes/CIE-auditori_ref-PRUEBA.pdf), dos páginas.
- [CIE base](../output/pdf/phase-0/CIE-datos-ficticios-PRUEBA.pdf) y [carpeta de variantes](../output/pdf/phase-0/cie-variantes/).
- [Resultado de la puerta técnica](../evidence/phase-0/status.json).

## Pruebas ejecutadas

| Prueba | Resultado | Evidencia |
|---|---|---|
| Generadores, valores inválidos, ausencias, opciones y protección de fuentes | 43 superadas; 0 fallidas | [TAP](../evidence/phase-0/unit-tests.tap) |
| BRIE: 59 campos inventariados, dos páginas y fondo conservado | Superada; 58 valores en la muestra y el campo condicional restante probado aparte; 0 píxeles fuera del relleno | [QA BRIE](../evidence/phase-0/brie-pixel-verification.json) |
| CIE: mapa del formulario | 70 campos lógicos; 69 proceden del XFA y tecnología se añade en el espacio libre de su etiqueta | [Mapa](../tools/pdf-phase0/cie-layout.json), TAP |
| CIE: 11 muestras, dos páginas A4, lectura de valores y ausencia de XFA/widgets | 11 superadas | [QA CIE](../evidence/phase-0/cie-static-verification.json) |
| CIE: fondo vectorial y cambios fuera de los campos | Vectores de origen conservados; 0 píxeles fuera de las zonas de escritura respecto al fondo de cada variante | QA CIE |
| Usos principales y pregunta del 50 % | 14 usos y Sí/No cubiertos por 19 archivos aportados; posición relativa estable | [Comparación](../evidence/phase-0/referencias-usos/comparison.json) |
| P1 y g3 Auditori frente al archivo del usuario en Adobe | Posición y salto de página corregidos y contrastados | [Comparación Auditori](../evidence/phase-0/referencia-auditori/comparison.json) |
| P2/h, otros usos y otra tensión en Adobe | Contrastados mediante tres copias diagnósticas propias; plantilla idéntica a la oficial | [Referencias y límites](../evidence/phase-0/cie-flow-reference-comparison.json) |
| Texto de todas las opciones P1/P2/g/h | Cabe completo, sin abreviar; se reduce a 7 pt solo cuando el ancho exige ajuste | TAP |
| Combinación P1 + Auditori y borrador incompleto | Completo legible; incompleto señala tres datos pendientes y no inventa respuestas | [Muestras y avisos](../evidence/phase-0/cie-static-generation.json) |
| Dependencias npm | Auditoría actual: 0 vulnerabilidades, incluidas altas/críticas | [Auditoría](../evidence/phase-0/npm-audit.json) |
| PDF revisados sin modificaciones posteriores | Huellas coincidentes | [Revisión](../evidence/phase-0/visual-review.json), puerta técnica |

## Solución del flujo del CIE

Se utiliza la conversión estática aportada como fondo. Se recortan y trasladan sus bloques vectoriales, sin borrar texto ni reconstruir la maquetación completa. P1/P2 insertan una fila de 6 mm debajo de los botones; la lista común de usos baja esa distancia. Los detalles g/h pasan a página 2 y desplazan el cuerpo técnico 13,5 + 3,822 mm. Otros usos ocupa 12,5 + 3,822 mm, con su borde fino inferior. Otra tensión se escribe a la derecha de «Altra» en su misma fila.

Los logotipos, códigos, numeración y pies permanecen en sus páginas. Se conservan los Ω y las divisiones de los códigos postales. La firma queda vacía. Tecnología no tiene un control XFA en el original: se escribe junto a su etiqueta en el espacio disponible.

La ruta interactiva directa de PDF.js no ejecutó los eventos condicionales; su diagnóstico fallido queda conservado. La solución estática supera ahora las comprobaciones del alcance de evaluación.

## Alcance y pendientes

No quedan fallos detectados en las pruebas previstas de esta fase. Aceptación recibida. Se autoriza comenzar la fase 1.

La comparación con Adobe es visual y se apoya en las medidas del XFA; no se declara igualdad de píxeles entre motores. La prueba automática de píxeles compara cada muestra con su propio fondo recompuesto y no demuestra por sí sola que los desplazamientos sean oficiales. Por eso se conserva también la referencia de Adobe.

Las referencias P2/h, otros usos y otra tensión son copias diagnósticas creadas por el generador de referencias, no originales independientes aportados por el usuario. Sus plantillas coinciden con la oficial; se modifica solo el estado del formulario. Las capturas finales están en `evidence/phase-0/derived-xfa-references/` y la vista de conjunto en [esta imagen](../evidence/phase-0/cie-flow-review-contact.png).

La fidelidad aquí comprobada corresponde a las muestras y variantes inventariadas. No acredita mediciones, cumplimiento normativo, firma ni aceptación administrativa. Los límites y avisos del formulario de la aplicación se desarrollarán en sus fases.

El generador no escribe en `plantillas`. La comprobación actual encuentra el archivo de trabajo idéntico a la referencia oficial preservada; las huellas históricas y actuales se documentan en [revisiones de fuente](../evidence/phase-0/sources/source-revisions.json) y [manifiesto SHA-256](../evidence/phase-0/sha256-2026-10-16.json).

## Reproducción

Véase [el procedimiento completo](../tools/pdf-phase0/README.md). Desde `tools/pdf-phase0`, ejecutar las pruebas, la generación CIE y `python3 verify_cie.py`; revisar las páginas y ejecutar `node gate.mjs`. Un resultado favorable deja el estado `PENDIENTE_ACEPTACION_USUARIO`. La aceptación no se simula ni se deduce de las pruebas.
