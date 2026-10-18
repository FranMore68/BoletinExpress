# Fase 9 — recargas de KC con Stripe en pruebas

La fase 8 ha sido aceptada por el usuario. Se ha implementado la fase 9 para evaluación con datos ficticios. El cierre técnico está completado, incluidas las pruebas contra Stripe en sandbox. Queda pendiente la aceptación del usuario. La fase 7 sigue aplazada; no se ha iniciado el despliegue.

## Comportamiento

En la cuenta privada, «Recargar KC de prueba» ofrece 10 KC por 10 € y 25 KC por 20 €. Checkout se abre en la página alojada por Stripe. Sin claves de pruebas y secreto del webhook, los botones permanecen desactivados. El saldo y el estado de las compras se actualizan desde la cuenta; los retornos de pago o cancelación no conceden créditos.

El servidor fija propietario, pack, importe y cantidad. Solo admite claves `sk_test_` o `rk_test_` y sesiones `cs_test_`, con `livemode=false`. No se envían campos del BRIE/CIE ni datos profesionales a Stripe. La interfaz de la aplicación es ES/CA; Checkout se solicita en español. Las pruebas utilizan tarjetas. Los métodos visibles se gestionan en la configuración de Stripe: la API actual ya no admite elegirlos mediante `payment_method_types` al crear Checkout. La aplicación no modifica esa configuración. No se crean suscripciones ni se aplican descuentos o impuestos automáticos.

La compra se registra antes de llamar a Stripe, con una solicitud UUID reutilizable y una clave de idempotencia estable. Sus parámetros, incluida la lengua de retorno, se conservan al reintentar. Por protección técnica se permiten 20 nuevas sesiones por cuenta y 24 horas reales; reutilizar una solicitud no consume otra. Una creación sin vincular que supera 20 minutos exige iniciar otra solicitud, evitando reutilizar una clave de Stripe fuera de su ventana de conservación. La sesión de pago vence una hora después del alta de la compra.

## Seguridad y transacciones

- `POST /api/private/payments/checkout`: sesión confirmada y activa, comprobación de origen, cuerpo acotado y catálogo cerrado.
- `GET /api/private/payments`: disponibilidad y últimas compras propias, sin claves ni identificadores de Stripe.
- `POST /api/payments/stripe`: firma HMAC-SHA256 del cuerpo original, tolerancia de 300 segundos con el reloj real y límite de 64 KiB. No usa cookies ni autorización por `Origin`; la autenticidad procede de la firma.
- Tras verificar la firma se consulta la sesión en la API de Stripe. Se contrastan modo de pruebas, estado pagado, moneda, importe, línea de producto, cantidad y referencias con la compra persistente.
- La migración `006-payments.sql` bloquea primero la cuenta y después la compra, igual que los cobros y las renovaciones. Abono, movimiento, referencia del pago y deduplicación del evento se confirman en una transacción.
- Unicidad por evento, sesión de Checkout, PaymentIntent y movimiento. Un aviso atrasado no rebaja una compra ya abonada. Un error antes de confirmar revierte todo y permite el reintento del webhook.
- El webhook puede vincular una sesión cuyo pago llega antes de guardarse la respuesta de creación. Si Stripe no responde, se devuelve error recuperable y no se marca el evento como procesado.
- RLS aísla compras entre cuentas. Ni el usuario, ni el worker, ni la credencial de créditos pueden conceder recargas. La nueva credencial `boletin_payments_api` solo ejecuta las tres operaciones de pagos; no tiene escritura directa en tablas.
- Claves solo en archivos privados ignorados por Git. El detector de secretos incorpora los secretos `whsec_`. No se registran claves, cuerpos de eventos ni datos de tarjetas.

La integración utiliza `fetch` y la criptografía de Node, sin dependencias nuevas. La API de Stripe queda fijada en `2026-09-30.endive`.

## Pruebas y evidencias

La [CI final 39144803728](https://github.com/FranMore68/BoletinExpress/actions/runs/39144803728) ha terminado correctamente sobre el commit `ee398af94ab1d7dbcc44178429c3acd245787f01`: 33 pruebas de aplicación, 43 PDF, 267 casos de catálogo y 67 grupos de integración. Se han construido y analizado diez imágenes, incluidas las nueve de aplicación/servicios y el CLI local, sin avisos altos ni críticos detectados. PostgREST conserva la limitación de inventario documentada en fase 8; la auditoría de Storage conserva 30 avisos moderados. Los informes originales están en `evidence/phase-9/ci-final/`, junto con `ci-final-run.json` y `ci-final-summary.json`.

El servidor de integración escucha solo en `127.0.0.1:3002`; usa Auth y PostgreSQL locales reales y un transporte Stripe simulado en un proceso aislado. Ese transporte no se copia a la imagen y ninguna variable o ruta de la aplicación puede activarlo. Las pruebas externas adicionales usan la aplicación normal y el sandbox real de Stripe.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Formato, tipos y 33 pruebas de aplicación | Superado localmente y en CI | `evidence/phase-9/ci-final-run.json` |
| Compilación Next.js e imagen web | Superado | Construcción local con Node 24 y Docker |
| Packs, firmas, propietario, doble clic, avisos concurrentes, errores y recuperación | 16 grupos superados con Stripe simulado | `evidence/phase-9/integration.json` |
| RLS de compras y permisos de la credencial restringida | Incluido en la batería de pagos | `evidence/phase-9/integration.json` |
| Regresión de cobros BRIE/CIE | 11 grupos superados | `evidence/phase-9/credit-regression.json` |
| Regresión de renovación, correo y conservación | 12 grupos superados | `evidence/phase-9/retention-regression/integration.json` |
| Interfaz ES/CA, móvil de 320 px y actualización del saldo | Comprobación de escritorio y móvil ES/CA | `evidence/phase-9/ui.json` y capturas |
| Auditoría npm de aplicación | 0 vulnerabilidades | Consulta actual a npm; no cambia el lockfile |
| Instalación desde cero, migraciones, regresiones y pagos en CI | 67 grupos superados (12 acceso, 8 BRIE, 8 CIE, 11 créditos, 12 conservación, 16 pagos) | `evidence/phase-9/ci-final-summary.json` y `ci-final/` |
| Imagen web final: Trivy con base actualizada | 0 avisos altos o críticos detectados | `evidence/phase-9/image-web.json` |
| Stripe real en sandbox: ambos packs, rechazo, cancelación y caducidad | Superado: 8 → 18 → 43 KC; solo dos recargas | `evidence/phase-9/stripe-live/results.json` |
| Repetición local de dos eventos reales de pago | HTTP 200 sin nuevos abonos; saldo 43 KC | `evidence/phase-9/stripe-live/results.json` |

## Reproducir localmente

Sobre los servicios de datos ya preparados, sin recrear volúmenes:

```sh
npm ci --ignore-scripts
sh scripts/apply-access.sh
node scripts/init-payment-key.mjs
npm run check
npm run build
node scripts/test-phase9.mjs
```

La última prueba no requiere cuenta ni claves de Stripe y no realiza conexiones con su API. Crea cuentas ficticias `@example.invalid`, un proceso web de prueba y un servidor de respuestas simuladas. El proceso termina al finalizar; no cambia el transporte del contenedor normal. La CI ejecuta esta misma batería después de las regresiones anteriores y conserva sus informes.

## Comprobación externa realizada

El 18/10/2026 se ha probado el recorrido alojado por Stripe, desde la cuenta privada de evaluación. Los dos packs se pagaron con la tarjeta ficticia aprobada: 10 KC por 10 EUR y 25 KC por 20 EUR. El listener entregó los avisos a la aplicación; el saldo pasó de 8 a 18 y después a 43 KC, con exactamente dos movimientos de recarga. No se han usado tarjetas ni cobros reales.

Otra sesión mostró el rechazo de tarjeta esperado. Se volvió mediante «Atrás» y también se canceló una cuarta sesión sin introducir tarjeta. Ninguna concedió KC. Ambas se hicieron caducar por la API de Stripe y sus avisos dejaron las compras como caducadas. Se repitieron localmente los cuerpos de los dos eventos reales recuperados de Stripe, con una firma HMAC nueva y válida: HTTP 200 y ningún abono adicional. Esta repetición comprueba la deduplicación local; no es un reenvío desde el panel de Stripe. Se conservan identificadores y resultados, sin cuerpos completos ni tarjetas, en `evidence/phase-9/stripe-live/results.json`.

La primera llamada externa descubrió que la API vigente rechaza `payment_method_types`. Se retiró ese parámetro y se repitieron las 33 pruebas de aplicación y los 16 grupos de pagos. Queda una compra diagnóstica sin sesión vinculada, sin pago ni movimiento, en la cuenta ficticia. No afecta al saldo. Las capturas muestran el entorno de pruebas y el rechazo; los datos de tarjeta están tapados.

## Listener y reproducción local

La clave del servidor está en el archivo privado ignorado `.secrets/stripe.env`; la clave pública no hace falta para Checkout alojado. El helper captura y guarda el secreto de firma sin mostrarlo. No compartir ninguna clave por chat.

```sh
docker build -f tools/stripe-cli/Dockerfile -t boletinexpress-stripe-cli:1.54.0-be1 tools/stripe-cli
node scripts/stripe-listen-local.mjs start
```

Se ha comprobado el ciclo de parada y arranque, incluida la recarga de web con el secreto nuevo:

```sh
node scripts/stripe-listen-local.mjs stop
node scripts/stripe-listen-local.mjs start
```

El listener queda activo para la evaluación local. No reiniciarlo por fuera del helper. La compilación usa la fuente oficial fijada por checksum y módulos corregidos; las pruebas de configuración, proxy y websocket de Stripe pasan y Trivy inventaría el binario Linux con cero avisos altos o críticos. El binario oficial macOS no se ejecutó porque su inventario presenta avisos altos. Véase `tools/stripe-cli/README.md` para procedencia y límites.

El conjunto mantiene 3072 MiB y 1 CPU de límites configurados, incluido el listener. Esto no sustituye la medición del VPS de fase 10. No se han modificado el VPS ni Control-Contracts-ATC.

Para repetir el recorrido, entrar en una cuenta de evaluación, abrir cada pack y usar las tarjetas oficiales de pruebas, fecha futura y CVC ficticio. Comprobar saldo e historial después de cada caso. La página de retorno nunca es la prueba de pago: comprobar el abono persistido tras el webhook. No ejecutar `stripe trigger` como sustituto del recorrido, porque sus compras genéricas carecen de las referencias de BoletinExpress.

La CI final ha superado también la construcción y el análisis del CLI aislado. Fallos funcionales pendientes detectados: ninguno. La revisión previa concluye **APTO CON OBSERVACIONES**; el detalle está en `evidence/phase-9/stripe-live/security-review.md`. La aceptación de esta fase queda pendiente del usuario, según el plan acordado. La fase 7 sigue sin iniciarse.

## Fuentes de la integración

- [Creación de Checkout](https://docs.stripe.com/api/checkout/sessions/create).
- [Confirmación y deduplicación de compras](https://docs.stripe.com/checkout/fulfillment).
- [Firma y reintentos de webhooks](https://docs.stripe.com/events/manage-webhook-endpoints).
- [Versionado de la API](https://docs.stripe.com/api/versioning).
- [Tarjetas de pruebas](https://docs.stripe.com/testing).
