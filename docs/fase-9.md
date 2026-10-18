# Fase 9 — recargas de KC con Stripe en pruebas

La fase 8 ha sido aceptada por el usuario. Se ha implementado la fase 9 para evaluación con datos ficticios. Su cierre requiere completar las pruebas contra Stripe en modo pruebas y la aceptación del usuario. La fase 7 sigue aplazada; no se ha iniciado el despliegue.

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

La [CI 39118962718](https://github.com/FranMore68/BoletinExpress/actions/runs/39118962718) ha terminado correctamente sobre el commit `5e1988677c6ad3cd5b06d67e91e5be87c4a9fe6b`: 31 pruebas de aplicación, 43 PDF, 267 casos de catálogo y 67 grupos de integración. Se han analizado nueve imágenes sin avisos altos ni críticos detectados. PostgREST conserva la limitación de inventario documentada en fase 8; la auditoría de Storage conserva 30 avisos moderados. El resultado exacto se registra en `evidence/phase-9/status.json`. El servidor de integración escucha solo en `127.0.0.1:3002`; usa Auth y PostgreSQL locales reales y un transporte Stripe simulado en un proceso aislado. Ese transporte no se copia a la imagen y ninguna variable o ruta de la aplicación puede activarlo.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Formato, tipos y 31 pruebas de aplicación | Superado localmente y en CI | `evidence/phase-9/ci-run.json` |
| Compilación Next.js e imagen web | Superado | Construcción local con Node 24 y Docker |
| Packs, firmas, propietario, doble clic, avisos concurrentes, errores y recuperación | 16 grupos superados con Stripe simulado | `evidence/phase-9/integration.json` |
| RLS de compras y permisos de la credencial restringida | Incluido en la batería de pagos | `evidence/phase-9/integration.json` |
| Regresión de cobros BRIE/CIE | 11 grupos superados | `evidence/phase-9/credit-regression.json` |
| Regresión de renovación, correo y conservación | 12 grupos superados | `evidence/phase-9/retention-regression/integration.json` |
| Interfaz ES/CA, móvil de 320 px y actualización del saldo | Comprobación de escritorio y móvil ES/CA | `evidence/phase-9/ui.json` y capturas |
| Auditoría npm de aplicación | 0 vulnerabilidades | Consulta actual a npm; no cambia el lockfile |
| Instalación desde cero, migraciones, regresiones y pagos en CI | 67 grupos superados (12 acceso, 8 BRIE, 8 CIE, 11 créditos, 12 conservación, 16 pagos) | `evidence/phase-9/ci-summary.json` y `ci/` |
| Imagen web final: Trivy con base actualizada | 0 avisos altos o críticos detectados | `evidence/phase-9/image-web.json` |
| Stripe real en modo pruebas: pago aprobado, tarjeta rechazada, cancelación, webhook repetido y retorno | Pendiente | Requiere claves y listener o endpoint configurado |

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

## Configuración externa pendiente

1. Preparar una cuenta o sandbox de Stripe en modo pruebas. No utilizar claves de cobros reales.
2. En el Mac, guardar en `.secrets/stripe.env` la clave del servidor en `STRIPE_SECRET_KEY` y el secreto de firma correspondiente en `STRIPE_WEBHOOK_SECRET`. El archivo privado ya está preparado. No compartir claves por chat ni incorporarlas al repositorio.
3. Para desarrollo local, configurar Stripe CLI para reenviar los eventos al puerto local:

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to http://127.0.0.1:3000/api/payments/stripe
```

El secreto del listener es distinto del secreto de un endpoint creado desde el panel; configurar el que corresponde a esta entrega. No ejecutar `stripe trigger` como sustituto del recorrido: sus compras genéricas no contienen las referencias de BoletinExpress.

4. Recrear solo el servicio web para cargar los secretos. Mantener el listener mientras duren las pruebas locales.
5. Abrir un pack desde una cuenta ficticia. Con la tarjeta de pruebas `4242 4242 4242 4242`, fecha futura y CVC de prueba, verificar un único abono. Repetir con el pack de 25 KC.
6. Probar la tarjeta rechazada `4000 0000 0000 0002`, cancelar desde Checkout y repetir la entrega de un evento de esa compra desde Stripe. Comprobar saldo y movimiento, sin tarjetas reales. Verificar también la llegada del webhook aunque no se visite el retorno.
7. Guardar evidencias sin claves ni datos completos de tarjetas. Cerrar esta fase solo tras superar estas comprobaciones y recibir la aceptación del usuario.

El VPS, Control-Contracts-ATC, Resend y sus credenciales no se modifican. Los límites de memoria y CPU de los servicios existentes se conservan. El despliegue HTTPS y el endpoint remoto pertenecen a la fase 10.

## Fuentes de la integración

- [Creación de Checkout](https://docs.stripe.com/api/checkout/sessions/create).
- [Confirmación y deduplicación de compras](https://docs.stripe.com/checkout/fulfillment).
- [Firma y reintentos de webhooks](https://docs.stripe.com/events/manage-webhook-endpoints).
- [Versionado de la API](https://docs.stripe.com/api/versioning).
- [Tarjetas de pruebas](https://docs.stripe.com/testing).
