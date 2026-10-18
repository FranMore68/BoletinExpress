# Fase 8: conservación y correo

Estado: cierre técnico completado el 18/10/2026, aceptado por el usuario el 18/10/2026. La fase 6 está aceptada. Orden autorizado: 8 → 9 → 7 → 10. La IA queda aplazada.

## Comportamiento

Cancelar una reserva de archivo encola también su objeto para borrarlo, aunque la subida haya terminado y se haya perdido su respuesta. El bloqueo del documento impide una carga tardía tras la cancelación.

El primer dato de formulario o archivo guardado inicia 24 horas. Un borrador vacío creado sin datos no inicia ese plazo. Los datos del perfil copiados al crear cuentan como datos guardados. Abrir expresamente un borrador ya iniciado habilita una renovación al vencer, con aviso del coste de 1 KC. Crear, guardar inicialmente, consultar la lista, cargar el visor y consultar trabajos en segundo plano no habilitan la renovación.

La renovación bloquea primero la cuenta y después el documento, igual que la validación. Descuenta 1 KC una sola vez, con movimiento único para ese vencimiento, y añade exactamente 24 horas al vencimiento anterior. El nuevo ciclo comienza sin actividad. Sin regreso o saldo se elimina el borrador. Si el worker llega cuando también ha vencido el posible ciclo siguiente, elimina sin cobrar tiempo ya consumido. No encadena renovaciones retroactivas.

El servidor y RLS bloquean datos, archivos y operaciones vencidos sin depender del worker. La renovación y el cierre se serializan; una validación sobre un borrador vencido no genera un cargo documental. Tras una renovación puede volver a validarse su PDF revisado si conserva la revisión y el comprobante válido.

A los 30 días del cierre se retiran descarga y visor, también directamente en Storage. El worker encola una copia al correo verificado. Desde la cuenta se puede solicitar el envío a ese correo, incluido el intervalo del día 30 al 60, sin facilitar otro destinatario. Se limita a una solicitud nueva por documento y hora real; repetir el mismo identificador devuelve el trabajo existente. El idioma de los envíos solicitados es ES/CA; el correo automático de archivo utiliza ES.

A los 60 días se retira todo acceso y el worker elimina el documento, metadatos finales, trabajos de correo y objetos privados. Una cola persistente permite reintentar la eliminación física cuando Storage vuelva a estar disponible. Los movimientos de saldo conservan importe e identificador de operación, con la referencia documental retirada. El perfil profesional se conserva para reutilizarlo.

Un fallo del correo no modifica ninguna fecha de conservación. Los adjuntos se comprueban por SHA-256 antes del envío y se autoriza de nuevo el trabajo inmediatamente antes de entregarlo al proveedor. La aceptación del mensaje por el transporte no demuestra su recepción en un buzón externo. Una copia enviada permanece en el buzón receptor según sus propias condiciones; la eliminación de BoletinExpress no borra ese buzón.

## Correo de evaluación

Por indicación del usuario, las pruebas usan el [buzón Mailpit local](http://127.0.0.1:54324/). La [aplicación local](http://127.0.0.1:3000/acceso?lang=es) conserva el acceso habitual. No se han configurado secretos de Resend ni enviado correo externo. El transporte Resend queda implementado mediante su API HTTPS, adjunto base64 y una clave estable de idempotencia por trabajo. Su integración se comprueba con un transporte simulado; la entrega real y el remitente verificado siguen pendientes para el despliegue.

El worker reclama un solo correo con lease y conserva estado, intentos, código de fallo y próxima fecha de reintento, sin registrar contenido ni destinatarios en logs. Los reintentos usan tiempo real y espera creciente, con un máximo de 12 intentos. No se reintenta automáticamente un trabajo fuera de 20 horas desde el primer intento: la [idempotencia documentada de Resend dura 24 horas](https://resend.com/docs/dashboard/emails/idempotency-keys). Así se evita afirmar una entrega exactamente una vez tras un corte prolongado y una respuesta incierta. El usuario puede solicitar una nueva copia. Mailpit no ofrece la misma garantía de deduplicación del proveedor: un corte tras aceptar un correo local y antes de confirmar el trabajo puede producir otra copia de prueba.

El cuerpo y el adjunto se envían según la [API oficial de Resend](https://resend.com/docs/api-reference/emails/send-email). Para Mailpit se ha contrastado el contrato con la API publicada por la propia instalación local v1.31.6, descrita en su [documentación oficial](https://mailpit.axllent.org/docs/api-v1/).

## Reloj de evaluación

`private.evaluation_clocks` admite únicamente cuentas confirmadas con correo `@example.invalid`. No tiene permisos para anon, usuarios, worker ni rol de créditos. No hay ruta HTTP para modificarlo. El administrador local debe autorizar expresamente cada cuenta. Solo permite avanzar, hasta 90 días de desplazamiento.

El reloj documental afecta a inicio de borrador, vencimiento, validación, acceso de 30 días y eliminación de 60 días. Auth, comprobantes de revisión, leases, reintentos y límites de correo siguen usando tiempo real. No se modifica el reloj del ordenador ni del VPS; Stripe no participa en esta fase.

```sh
APP_ENV=evaluation node scripts/evaluation-clock.mjs enroll UUID_DE_CUENTA_FICTICIA
APP_ENV=evaluation node scripts/evaluation-clock.mjs advance UUID_DE_CUENTA_FICTICIA 24
APP_ENV=evaluation node scripts/evaluation-clock.mjs show UUID_DE_CUENTA_FICTICIA
```

El comando exige `APP_ENV=evaluation` y acceso administrativo a Docker local. Para observar las tareas, el worker debe estar en marcha. El salto de reloj puede hacer que se eliminen definitivamente los documentos ficticios de esa cuenta; no se aplica a cuentas reales. Las pruebas envejecen un registro ficticio de correo para comprobar el reenvío del día 59 sin esperar una hora real; no adelantan los límites de Auth ni del proveedor.

## Pruebas y evidencias

| Prueba | Resultado | Evidencia |
|---|---|---|
| Inicio de 24 horas, consultas automáticas y acceso con worker parado | Superado en batería local | `evidence/phase-8/integration.json` |
| Renovaciones sucesivas, concurrencia, falta de saldo y retraso del worker | Superado en batería local | `evidence/phase-8/integration.json` |
| Coincidencia de validación y vencimiento | Superado en batería local | `evidence/phase-8/integration.json` |
| Correo local con adjunto íntegro ES/CA, reintentos y leases | Superado en batería local | `evidence/phase-8/integration.json` |
| Bloqueo al día 30, reenvío al 59 y eliminación al 60 | Superado en batería local | `evidence/phase-8/integration.json` |
| Regresión local de acceso tras corregir cargas | Superado: 12 grupos | `evidence/phase-8/access-regression/isolation.json` |
| Regresión local de créditos tras corregir cargas | Superado: 11 grupos | `evidence/phase-8/credit-regression/integration.json` |
| Tipos, formato, exclusión de secretos y 27 pruebas de aplicación | Superado | `evidence/phase-8/check.log` |
| Dependencias de aplicación y worker | Sin avisos comunicados por npm audit | `audit-app.log`, `audit-worker.log` |
| Primer archivo sin campos guardados | Superado en batería local | `evidence/phase-8/integration.json` |
| Interfaz ES/CA y archivo sin descarga en móvil de 320 px | Superado | `evidence/phase-8/ui.json` y capturas |
| Instalación limpia y regresión de fases anteriores | Superado: 51 grupos de integración | [CI 39108937933](https://github.com/FranMore68/BoletinExpress/actions/runs/39108937933) |

La última batería local ha completado 12 grupos, incluida la cancelación de una reserva tras subir el archivo y la concurrencia entre finalizar y cancelar. Las cuentas ficticias utilizadas avanzan de forma independiente; las pruebas comprueban también origen ajeno, sesión ausente, permisos del reloj y llamadas directas a Storage. La interfaz se ha comprobado con un borrador reabierto y con una cuenta exclusiva en el día 31: avisos de renovación, retirada del visor/descarga, fecha de eliminación y reenvío con Espacio. Los mensajes automático ES y solicitado CA han quedado aceptados en Mailpit. En móvil, ventana de 320 px y contenido de 305 px, sin desbordamiento horizontal.

Los nueve servicios locales conservan 3008 MiB y 1 CPU de límites conjuntos, sin OOM ni reinicios observados (`container-budget.json`). Esto no sustituye a la prueba de capacidad del VPS prevista para la fase 10.

## Reproducción local

Se conservan las credenciales y los volúmenes existentes. No se repite el generador inicial sobre una instalación preparada.

```sh
sh scripts/apply-access.sh
docker build --target web -t boletinexpress-web:phase1 .
docker build --target worker -t boletinexpress-worker:phase1 .
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait
npm run check
node scripts/test-phase8.mjs
```

La batería crea cuentas ficticias exclusivas, detiene el worker durante los ensayos de vencimiento y lo vuelve a arrancar mediante `finally`. Necesita Mailpit y Docker locales. La migración `005-retention` se ejecuta una sola vez y no recrea Auth, Storage ni sus claves. Las futuras entradas de extracción deberán vincularse a la misma política de vida del documento.

Para habilitar Resend más adelante se guardarán `MAIL_TRANSPORT=resend`, `MAIL_FROM` y `RESEND_API_KEY` en `.secrets/mail.env`, solo cargado por el worker y excluido de Git. La configuración SMTP de Auth se mantiene separada, mediante las variables ya previstas en Supabase. No hay cambios en el VPS ni en Control-Contracts-ATC.

## Incidencias resueltas

Se corrige una reserva cancelada tras subir: ahora su objeto se encola para borrarlo y el documento se bloquea antes que la reserva tanto al finalizar como al cancelar. La prueba concurrente comprueba un solo resultado efectivo y ausencia de errores; el worker elimina después el objeto.

La ejecución de CI 39107487872 superó los 51 grupos de integración y las nueve auditorías de imágenes, pero terminó con estado fallido porque `tee` abrió el registro antes de que el script crease la carpeta de evidencias. Se añade `mkdir -p` antes de la captura. Los informes originales de esa ejecución están en `evidence/phase-8/ci-before-log-directory-fix/`; no se presenta su estado global como correcto. La ejecución final 39108937933 confirma también la recogida del registro.

## Límites pendientes

No se ha probado entrega externa con Resend. No se ha desplegado en el VPS. La prueba de capacidad, la retirada tras la evaluación y las credenciales del despliegue siguen en sus fases correspondientes. La CI final confirma 30 avisos moderados de Storage y ninguna vulnerabilidad alta o crítica detectada en las nueve imágenes analizadas. La imagen estática de PostgREST no ofrece inventario al escáner; el resultado no cubre sus dependencias Haskell. Estas observaciones siguen abiertas para el despliegue.

## CI y cierre

La ejecución [39108937933](https://github.com/FranMore68/BoletinExpress/actions/runs/39108937933) ha terminado correctamente en 14 minutos y 20 segundos. Corresponde al commit `31507551b4c9c9d8a9f5d74e3f82cca6da257553`; el último cambio es la preparación de la carpeta del registro. El código funcional corresponde a `f7cb32e2a18d5b1e4de13444b81744904a882160`.

Han pasado 27 pruebas de aplicación, 43 pruebas PDF, 267 casos de catálogo y 51 grupos de integración: acceso 12, BRIE 8, CIE 8, créditos 11 y conservación 12. Las nueve auditorías de imágenes han superado el umbral alto/crítico. Los informes originales de esta ejecución están en `evidence/phase-8/ci/`; `ci-summary.json` y `ci-run.json` conservan los resultados y la referencia exacta. Los avisos de mantenimiento de GitHub sobre upload-artifact y ubuntu-latest no causan fallos.

La comprobación local final encuentra cero objetos sin registro y cero borrados pendientes (`cleanup-closure.json`). Los servicios locales permanecen disponibles; la sesión ficticia utilizada en el navegador se ha cerrado y su pestaña temporal se ha retirado. El tamaño del navegador vuelve al valor habitual.

Fallos funcionales pendientes detectados: ninguno. Quedan por verificar el correo externo con Resend y la capacidad/despliegue del VPS. La revisión de seguridad concluye **APTO CON OBSERVACIONES**, según `evidence/phase-8/security-review.md`. La fase 9 no se ha iniciado y requiere aceptar este cierre. La fase 7 permanece aplazada hasta después de la 9.


## Prueba externa de Resend — 18/10/2026

Se ha cargado la clave de envío desde `.secrets/mail.env`, sin mostrarla ni versionarla. Se ha enviado una única prueba al correo indicado expresamente por el usuario, usando el transporte documental existente y el remitente `BoletinExpress <boletinexpress@moremaker3d.cloud>`. El adjunto es el BRIE ficticio de fase 0: dos páginas con datos de prueba y aviso de que no acredita ninguna instalación, revisadas antes del envío. No se modifican originales ni se crean datos profesionales reales.

Resend ha respondido HTTP 200 y ha devuelto un identificador de mensaje. Esto demuestra aceptación por la API; el usuario ha confirmado su recepción y que el PDF se abre correctamente. La prueba conserva una clave de idempotencia privada para evitar repetir el envío si se ejecuta otra vez. No se consulta el panel ni la API de administración con la clave restringida de envío.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Formato y permisos del secreto local | Clave con prefijo previsto, sin espacios internos; archivo privado excluido de Git | Comprobación local sin imprimir valores |
| Transporte, adjunto íntegro e idempotencia | 2 pruebas unitarias superadas | `tests/mail.test.ts` |
| Envío externo de un PDF ficticio al destino autorizado | Aceptado por Resend, HTTP 200 | `evidence/phase-8/resend-external.json` |
| Recepción y apertura del adjunto | Confirmadas por el usuario: «Recibido y PDF correcto» | `evidence/phase-8/resend-external.json` |

El worker normal continúa con Mailpit. No se activan envíos externos de los trabajos ficticios acumulados ni se modifica el SMTP de Auth. La activación general deberá separar primero esas pruebas de los envíos a cuentas con correo real verificado. La fase 9 está implementada y verificada en CI, pendiente de configurar Stripe; esta comprobación de correo no altera el orden acordado ni inicia la fase 7.

## Activación general de Resend — 18/10/2026

El usuario ha autorizado terminar las integraciones. Resend queda activo tanto para documentos reales de evaluación como para los correos de acceso. El usuario confirma la recepción de los nuevos correos y que el BRIE adjunto es correcto.

- Documentos: el worker utiliza la API de Resend. Si el destinatario termina en `.invalid`, solo utiliza Mailpit en el entorno de evaluación; fuera de ese entorno o sin un buzón local permitido, rechaza el envío sin llamar a Resend.
- Acceso: Auth entrega por SMTP a Mailpit; este relay local reenvía las direcciones reales a Resend por TLS en el puerto 465. Su bloqueo de `.invalid` mantiene las cuentas ficticias en local. Los errores SMTP se devuelven a Auth; no se confunde la captura local con la aceptación externa.
- El relay solo procesa mensajes nuevos. Antes de activarlo se ha comprobado que no había trabajos documentales pendientes con destinatarios reales. El buzón continúa publicado solo en loopback. Esta configuración corresponde al piloto local, con copias de prueba retenidas en Mailpit; la configuración remota se revisará en fase 10.
- Secretos exclusivamente en `.secrets/mail.env` y `.secrets/auth-mail.env`. Auth recibe únicamente el remitente en `.secrets/supabase.env`; no se han cambiado claves de Auth ni credenciales de otras aplicaciones.

La autenticación SMTP respondió 235. El primer intento de registro agotó el plazo de Auth: Mailpit tenía una cuota de 0,01 CPU. Se redistribuyen 0,04 CPU desde web (0,34→0,30) a Mailpit (0,01→0,05), sin aumentar el total de 1 CPU ni los 3008 MiB. Tras el ajuste se completan registro, reenvío, confirmación y solicitud de recuperación. La contraseña de la cuenta de evaluación no se cambia durante la prueba de recuperación. El BRIE ficticio se genera y valida en la aplicación una sola vez (10→8 KC); el worker confirma su envío en el primer intento. Se ha revisado el PDF y el usuario confirma su recepción correcta.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Pruebas de aplicación, configuración reversible y selección de transporte | 33 superadas | `tests/mail.test.ts`, `tests/mail-configuration.test.ts` |
| Registro, confirmación, reenvío, recuperación e aislamiento con relay activo | 12 comprobaciones superadas | Regresión local `scripts/test-isolation.mjs` |
| Renovación, archivo, correo ficticio y eliminación con Resend activo | 12 grupos superados | `evidence/phase-8/resend-activation/retention/integration.json` |
| SMTP autenticado, recorrido real y abono de bienvenida único | Superado | `evidence/phase-8/resend-activation/status.json` |
| Envío de documento por el worker y recepción del usuario | Un intento, sin error; usuario confirma correos y PDF | `evidence/phase-8/resend-activation/status.json` |
| Imágenes web y worker modificadas | Sin avisos altos ni críticos detectados | `evidence/phase-8/resend-activation/image-*.json` |

### Reproducir o volver al buzón local

Con la clave de envío y el remitente verificado ya guardados en el archivo privado:

```sh
node scripts/configure-resend.mjs enable
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml up --detach --wait --no-deps mail auth
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait web worker
```

Para desactivar el envío externo y recuperar el remitente anterior:

```sh
node scripts/configure-resend.mjs disable
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml up --detach --wait --no-deps mail auth
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait web worker
```

El script no recrea datos. Conserva una copia privada del remitente anterior, usa permisos 0600 y rechaza sobrescribir una configuración SMTP ajena. Los contenedores deben recrearse para cargar los cambios.

Fuentes: [SMTP de Resend](https://resend.com/docs/send-with-smtp), [relay selectivo y bloqueo de destinatarios de Mailpit](https://mailpit.axllent.org/docs/configuration/smtp-relay/).
