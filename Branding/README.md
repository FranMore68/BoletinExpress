# Branding de BoletinExpress

Guarda esta carpeta `Branding` dentro de la carpeta local de la aplicación. Este documento reúne las decisiones aprobadas de identidad visual y explica qué archivos sirven como marca y cuáles son muestras de aplicación.

---

## Estado de los archivos

**Listos para usar como identidad:** `logo-horizontal-claro.svg`, `logo-horizontal-oscuro.svg`, sus equivalentes `.png`, `simbolo-claro.svg`, `simbolo-oscuro.svg`, `favicon.svg` y los PNG `favicon-16.png`, `favicon-32.png`, `favicon-64.png`, `favicon-180.png`, `favicon-192.png` y `favicon-512.png`. Los SVG tienen fondo transparente salvo el favicon, que lleva fondo azul. El nombre del logotipo está convertido a trazos vectoriales: no depende de que haya una fuente instalada.

**Muestras visuales:** `lamina-identidad.svg` / `.png`, `muestra-interfaz.svg` / `.png` y `muestra-movil.svg` / `.png`. Sirven para ver la aplicación de la marca. No son pantallas programadas ni plantillas de documentos oficiales.

## Logotipo

- Nombre fijo: **BoletinExpress**, sin tilde. No traducir el nombre de la marca.
- Usar la versión clara sobre blanco, gris muy claro o fondos claros uniformes. Usar la versión oscura sobre azul marino u otros fondos oscuros uniformes.
- Dejar alrededor un espacio libre mínimo equivalente al ancho de una celda del símbolo (22 unidades en el archivo del símbolo).
- Ancho mínimo recomendado del logotipo horizontal: **200 px**. Por debajo, usar el símbolo. El favicon simplifica el símbolo para que se distinga a 16 px.
- Mantener las proporciones. No recolorear el cuadrado ámbar, añadir efectos ni colocar el logotipo sobre una fotografía con contraste irregular.
- Los emblemas de la Generalitat y el diseño de BRIE/CIE no forman parte de la marca.

## Colores

| Color | Código | Uso |
|---|---|---|
| Azul marino | `#0B2545` | Marca, encabezados, navegación, botones principales, foco visible |
| Ámbar | `#E08E00` | Celda distintiva del símbolo, indicador de paso y acentos breves |
| Blanco roto | `#F8F9FA` | Fondo general de página |
| Blanco | `#FFFFFF` | Tarjetas, campos y texto sobre azul marino |
| Tinta | `#12161A` | Texto principal sobre superficies claras |
| Gris texto | `#4D5C6C` | Texto secundario y ayudas |
| Gris control | `#5F6F80` | Bordes de campos y controles que deban identificarse |
| Gris claro | `#D9E3E9` | Separadores decorativos; no usar solo para delimitar campos |
| Rojo de error | `#A4262C` | Mensajes y estados de validación errónea, siempre con texto o icono |
| Verde de confirmación | `#1B6B50` | Confirmaciones, siempre con texto o icono |

No usar ámbar para texto pequeño sobre blanco o blanco para texto sobre ámbar. Si el ámbar sirve de fondo de una etiqueta, escribir en azul marino.

## Tipografía

- **Plus Jakarta Sans 600/700:** títulos de página y secciones. Tamaños orientativos: 30 px en escritorio y 25 px en móvil para título principal; 22 px para secciones.
- **Inter 400/500/600:** navegación, párrafos, etiquetas, formularios, botones y cifras. Texto normal de **16 px** y altura de línea de 24 px; ayudas de **14 px** y altura de línea de 20 px.
- Los números técnicos, unidades y códigos de expediente deben usar una presentación clara, sin abreviaturas decorativas.
- El logotipo entregado usa letras vectoriales fijas, por lo que no cambia al cargar las fuentes de interfaz.

Fuentes de referencia: [Inter](https://github.com/rsms/inter) y [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans). Ambas tienen licencia SIL Open Font License. Los archivos de fuente no están incluidos en este paquete.

## Botones, formularios y páginas

- **Botón principal:** azul marino, texto blanco, altura mínima de 48 px, texto de 16 px seminegrita, esquinas de 6 px. Reservarlo para la acción principal del paso, por ejemplo «Continuar» o «Generar borrador en PDF».
- **Botón secundario:** fondo blanco, borde azul marino de 2 px y texto azul marino. Mantener el mismo alto que el principal.
- **Foco de teclado:** contorno exterior azul marino de 2 px, separado 2 px del control. No depender solo del cambio de color del fondo.
- **Campos:** etiqueta visible encima, entrada de al menos 48 px de alto y borde de 2 px `#5F6F80`. El texto de ejemplo no sustituye la etiqueta. Mostrar los errores debajo del campo, con texto explícito.
- **Opciones BRIE / CIE ELEC-1:** selección con borde y marca visibles, más el nombre completo de la opción. El color por sí solo no comunica el estado.
- **Voz y foto:** icono acompañado de texto, como «Añadir datos por voz» y «Subir foto». Explicar después qué datos se han extraído y cuáles necesitan revisión.
- **Páginas:** composición en retícula de 8 px. En escritorio, formulario y vista de borrador pueden ocupar dos columnas. En móvil, apilar contenido y mantener el siguiente paso después de los campos. El PDF de ejemplo debe identificarse como **borrador**.
- La interfaz principal se redacta en **castellano**. La traducción al catalán debe disponer de espacio suficiente para textos más largos y conservar los mismos tamaños y contrastes.

## Contraste comprobado

| Combinación | Relación aproximada | Aplicación |
|---|---:|---|
| Azul marino sobre blanco roto | 14,6:1 | Títulos y texto |
| Tinta sobre blanco | 18,2:1 | Texto principal |
| Blanco sobre azul marino | 15,4:1 | Botón principal |
| Azul marino sobre ámbar | 5,9:1 | Etiqueta con fondo ámbar |
| Gris texto sobre blanco | 6,9:1 | Ayudas |
| Gris control sobre blanco | 5,2:1 | Bordes de campos |
| Ámbar sobre blanco | 2,6:1 | Solo acento decorativo; no texto ni único indicador de estado |

Estas combinaciones superan los mínimos WCAG 2.2 AA aplicables al texto normal (4,5:1) y a los indicadores esenciales de controles (3:1), excepto el ámbar sobre blanco, cuyo uso queda restringido. La accesibilidad de la aplicación completa debe verificarse sobre las pantallas implementadas, incluidas las vistas móviles y los estados de interacción.
