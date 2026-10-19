# Fase 10 · Despliegue y evaluación

Estado a 19 de octubre de 2026: **cerrada y aceptada expresamente por el usuario**.

Web: **https://boletinexpress.moremaker3d.cloud**. Piloto temporal con datos ficticios y Stripe en pruebas. Las cuentas del entorno local no se han copiado al VPS. La fase 11 no ha comenzado.

## Alcance y configuración efectiva

Se ha trabajado exclusivamente en el proyecto BoletinExpress, entorno production, recurso `boletinexpress-evaluacion`, UUID `hepqrz8hrz58omwradhcvzgj`. El nombre del entorno no habilita documentación real ni cobros reales. No se han modificado otros proyectos, en particular Staging-Pimet; tampoco el proxy global ni la configuración Docker global de acceso al registro.

El Compose de `infra/coolify/compose.yaml` ejecuta nueve servicios permanentes y un auxiliar `migrate`. Límites conjuntos efectivos: **3072 MiB y 1 CPU**. Migración con salida 0; su sonda heredada de PostgreSQL no representa la salud de un proceso terminado y queda excluida en Coolify. No hay puertos publicados en el host. Redes y volúmenes son exclusivos del recurso. Solo web tiene ruta pública, hacia el puerto interno 3000.

Coolify añade una red propia del UUID y carga un `.env` común. Se anulan las credenciales innecesarias con **116 marcadores `disabled`**, comprobados en los diez contenedores sin imprimir secretos. El parser regenera `SERVICE_KEY` antes de definir `SERVICE_ROLE_KEY`: Storage lo resuelve con `${SERVICE_ROLE_KEY}` y los otros nueve servicios lo anulan. Gateway conserva `${SERVICE_ROLE_KEY:?}` para rechazar una clave vacía antes del arranque. La prueba de regresión reproduce el orden y comprueba ese rechazo.

Las nueve imágenes están precargadas y fijadas por digest, con `pull_policy: never`. Las siete propias se construyeron fuera del VPS y permanecen privadas en GHCR. El cargador comprobó privacidad y asociación con el repositorio privado, utilizó un directorio Docker temporal y lo retiró. El PAT no forma parte del entorno de la aplicación.

## Entrega y comprobaciones automáticas

- Imágenes de aplicación: commit `fe0dfabcae234925dfdd0f0bf7998194667d473c`; [CI 39175211828](https://github.com/FranMore68/BoletinExpress/actions/runs/39175211828) y [release 39194683308](https://github.com/FranMore68/BoletinExpress/actions/runs/39194683308) correctas.
- Adaptaciones de despliegue: commit `2c6e30eedf339a216049b6a815120a979fb250b7`; [CI final 39201187498](https://github.com/FranMore68/BoletinExpress/actions/runs/39201187498) correcta. No cambia aplicación, dependencias, SQL ni Dockerfiles respecto a las imágenes publicadas.
- Batería: 37 pruebas de aplicación, 43 pruebas PDF, 267 casos de catálogo, siete baterías de integración, compilación y controles de secretos/dependencias/imágenes. Evidencia de los pasos finales: `evidence/phase-10/ci-final.json`.
- La primera CI detectó CVE-2026-77214 HIGH en libexpat 2.8.5-r0 de Storage y bloqueó la publicación. Se actualizó a 2.9.0-r0; CI y release posteriores no detectaron HIGH/CRITICAL. Se conservan `ci-attempt-1` y `storage-fix` como historial.
- Trivy conserva las limitaciones de inventario Haskell de PostgREST documentadas en fase 7. Un análisis sin avisos altos no garantiza ausencia de vulnerabilidades.

## Resultados y evidencias

Rutas relativas a `evidence/phase-10/`.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Instalación nueva y migraciones | Superada localmente; arranque remoto con nueve servicios y migración salida 0 | `local-startup.json`, `runtime-summary.json` |
| Límites, redes, volúmenes y credenciales | 3072 MiB, 1 CPU, cero puertos host; diez entornos comprobados | `runtime-summary.json`, `coolify-alias-order.json` |
| Registro privado de imágenes | Siete paquetes privados; nueve referencias por digest y arquitectura amd64 | `registry-privacy.json`, `release/images.env.example` |
| HTTPS público | HTTP redirige a HTTPS; respuesta 200 y certificado verificado sin excepciones | `https.json`, `public-https.png` |
| Dos cuentas ficticias y aislamiento | Cookies Secure/HttpOnly/SameSite; anónimo rechazado; PDF de otra cuenta rechazado | `public-journey.json` |
| BRIE y CIE | Dos páginas revisadas por modelo, validadas y descargadas; huella idéntica al PDF revisado; datos de trabajo retirados | `public-journey.json`, `public-brie-preview.png`, `public-cie-preview.png` |
| Créditos | +10 iniciales, −2 BRIE, −5 CIE, +10 recarga: saldo 13 KC | `public-journey.json`, `stripe-test-paid.png` |
| IA desde VPS | Extracción real de texto ficticio; propuestas pendientes de revisión, sin mediciones inventadas ni aplicación automática | `public-journey.json` |
| Correo documental CA | PDF recibido en buzón privado de evaluación; huella del adjunto coincide con el CIE validado | `public-journey.json` |
| Resend desde VPS | TLS y autenticación SMTP correctos; sonda sin envío de mensaje | `resend-smtp.json` |
| Stripe de prueba | Checkout de 10 € simulado; webhook remoto habilitado; dos repeticiones del evento no duplican el abono | `stripe-webhook.json`, `public-journey.json`, `stripe-test-checkout.png` |
| Capacidad | Superada con dos usuarios y un único PDF simultáneo | `capacity-summary.json`, `capacity-passed.png` |
| Comprobación personal de registro/correo/acceso | Superada: el usuario confirma que ha creado la cuenta, validado el correo y accedido | `user-access-confirmation.json` |

El ensayo de carga duró **603,7 segundos**, generó **20 PDF diferentes** y realizó **216 lecturas**. La observación de 660,284 segundos cubre toda la carga. CPU media durante la carga: **77,157 %**; memoria disponible mínima: **3,971 GiB**; disco libre mínimo: **55,742 GiB**. No se observaron OOM ni reinicios. Supera los umbrales acordados, con margen de CPU reducido para aumentar concurrencia. La carga se ejecutó por HTTP interno y el recorrido público HTTPS se comprobó después por separado.

El usuario confirmó durante la carga: «Responde como antes, sin errores», referido a Control-Contracts-ATC. Es una observación humana; no hay referencia cuantitativa de latencia. No se accedió a ese proyecto para medirla.

## Correo, pagos y límites de la comprobación

Las direcciones ficticias `.invalid` permanecen en Mailpit privado, incluso con Resend configurado. El envío documental probado aquí verifica el worker, el idioma y el PDF adjunto. La sonda SMTP verifica conectividad y credencial de Resend desde el VPS, sin enviar correo externo. La entrega real de correos de acceso y PDF ya fue confirmada por el usuario en fases anteriores; el usuario ha confirmado también el registro, la validación del correo y el acceso remoto. No se atribuye a esa sonda un envío que no realizó.

El endpoint Stripe exclusivo `we_1US33kBOYpfv3qqp1G3eRDzC` escucha `checkout.session.completed` en `/api/payments/stripe`, con secreto distinto del CLI local. Se comprobó `livemode: false` antes del pago simulado. No se modificaron otros endpoints.

La foto, audio y permisos de cámara/micrófono se probaron en fase 7. En el VPS se ha repetido extracción de texto; no se afirma haber repetido allí una grabación física. Los vencimientos y sus fallos se cubren con las integraciones automáticas y el reloj de evaluación; no se han esperado 60 días reales.

Los informes completos del host quedan en el directorio exclusivo `/tmp/boletinexpress-evaluation-c585cff` del VPS. Los resúmenes y capturas sin secretos están versionados. No se conserva en Git contenido documental de cuentas personales ni copias de datos del piloto.

## Cierre aceptado

El usuario ha confirmado el registro, la validación del correo y el acceso, y ha aceptado expresamente el cierre el 19 de octubre de 2026: «Ok, todo ha funcionado a las mil maravillas. podemos cerrar la fase 10.». Evidencia: `evidence/phase-10/phase-acceptance.json`.

La aplicación continúa activa durante la evaluación. La fase 11 no ha comenzado.

No hay fallos técnicos conocidos pendientes en las pruebas ejecutadas. La [guía de reproducción y retirada](reproduccion-y-retirada.md) conserva los pasos operativos. La retirada y el borrado de volúmenes requieren confirmar el fin de la evaluación.
