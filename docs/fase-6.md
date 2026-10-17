# Fase 6: créditos y validación documental

Estado: cierre técnico completado el 18/10/2026, pendiente de aceptación del usuario. La fase 5 fue aceptada el 18/10/2026 mediante «ok vamos con la fase 6». La fase 7 requiere aceptar este cierre.

## Resultado

La cuenta muestra saldo y los últimos 50 movimientos. Se conceden 10 KC una sola vez después de confirmar el correo, también para las cuentas del piloto confirmadas antes de esta migración. Acceder de nuevo o repetir la confirmación no concede más créditos.

Generar y revisar una vista previa sigue siendo gratuito. Después de mostrar las dos páginas, el editor permite confirmar la revisión y validar con el coste visible: 2 KC para BRIE o 5 KC para CIE. La operación cierra el documento; el editor se sustituye por el PDF privado, su descarga y la apertura para imprimir. No implica firma ni comprobación normativa.

Una transacción bloquea primero la cuenta y después el documento, comprueba sesión, propietario, revisión, estado, PDF listo y saldo; descuenta el coste fijo, registra un movimiento único y cierra el documento. Los reintentos devuelven el cierre existente. El saldo no puede ser negativo y cada documento admite un solo cargo.

La revisión utiliza un comprobante HMAC de 30 minutos que vincula usuario, sesión, documento, revisión y SHA-256. El servidor lo emite después de verificar los bytes del PDF de dos páginas; vuelve a comprobarlos antes del cobro. La interfaz habilita la confirmación después de renderizar ambas páginas. Esto acredita qué archivo se entrega para revisar; la revisión humana se confirma expresamente mediante la casilla.

El rol de créditos del servidor solo puede ejecutar la operación de validación. No dispone de acceso administrativo, escritura directa en tablas ni capacidad de crear documentos. Los clientes y el worker no pueden ejecutar esa operación. Las descargas requieren sesión y propietario, sin enlaces públicos o firmados reutilizables.

El PDF validado conserva los mismos bytes y objeto inmutable que se revisó. Su registro final contiene revisión, SHA-256, coste, fecha y ruta privada. Al validar se vacían los datos de trabajo y se eliminan las filas de fuentes, cola y vistas previas. Una cola privada permite al worker borrar los objetos de fuentes y vistas previas anteriores con reintentos; el PDF final queda excluido. Se bloquean las altas de objetos frente al cierre para evitar cargas tardías. El perfil profesional se conserva para nuevos documentos.

## Pruebas y evidencias

La batería local de créditos comprende 11 grupos.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Concesión única, saldo e historial | Superado | `evidence/phase-6/integration.json` |
| Aislamiento, permisos y comprobante de revisión | Superado | `evidence/phase-6/integration.json` |
| Doble clic, concurrencia y reintentos | Superado | `evidence/phase-6/integration.json` |
| Cobro BRIE/CIE, saldo insuficiente y fallos de PDF | Superado | `evidence/phase-6/integration.json` |
| Documento cerrado, PDF idéntico y retirada de fuentes | Superado | `evidence/phase-6/integration.json` |
| Formato, tipos y 25 pruebas de aplicación | Superado | `evidence/phase-6/check.log` |
| Dependencias de aplicación y worker | Sin vulnerabilidades notificadas | `evidence/phase-6/audit-app.log`, `audit-worker.log` |
| Dependencias de Storage | Sin altas ni críticas; 30 avisos moderados | `evidence/phase-6/audit-storage.log` |
| Instalación desde cero, 39 grupos de integración y nueve imágenes | Superado; sin altas o críticas detectadas | [CI 39077607312](https://github.com/FranMore68/BoletinExpress/actions/runs/39077607312), commit `54718ed` y `evidence/phase-6/ci/` |
| Nueve servicios principales dentro del presupuesto | Superado: 3008 MiB, 1 CPU, sin reinicios ni OOM | `evidence/phase-6/container-budget.json` |
| Interfaz ES/CA y móvil 320 px | Superado: saldo, historial, revisión por teclado, costes, cierre y descarga | `evidence/phase-6/ui.json` y capturas |

## Incidencias resueltas y límites

El registro inicial agotó el plazo de Auth con 0,04 CPU y sin bloqueo de base de datos. Se redistribuye el mismo presupuesto conjunto de 1 CPU. La distribución final reserva 0,15 CPU para Auth, 0,10 para PostgreSQL y 0,34 para el frontal; mantiene las demás cuotas. No aumenta la memoria ni se modifican servicios del VPS. El registro posterior ha funcionado.

Los primeros ensayos de ocho validaciones simultáneas encontraron consultas a Auth que agotaron su plazo. Un fallo temporal de Auth se devuelve como 503 recuperable, sin indicar falsamente que la sesión ha caducado. El ensayo inicial conservado en `integration-before-final-budget.json` obtuvo ocho 503 recuperables y confirmó un cargo único al reintentar. No demuestra ocho validaciones simultáneas de negocio. La batería final comprueba por separado ocho transacciones simultáneas con el rol restringido (un único cargo), el doble clic HTTP y tres CIE concurrentes con 10 KC (dos cargos y un rechazo). Con la distribución final, las dos peticiones del doble clic devuelven 200 sin 503 y tres CIE concurrentes obtienen 200, 200 y 402. Las mediciones de capacidad del VPS corresponden a la fase 10.

Los 30 avisos moderados de dependencias transitivas de Storage quedan registrados; no se actualizan indiscriminadamente dependencias del servicio durante esta fase. No se han detectado altas ni críticas en las nueve imágenes analizadas. La imagen estática de PostgREST no proporciona inventario de paquetes a Trivy; este resultado no cubre sus dependencias Haskell. Una vulnerabilidad conocida alta o crítica impediría cerrar la fase.

La retirada al día 30 se aplica al acceso directo al PDF. Correo, reenvío, reloj de evaluación, renovaciones y eliminación al día 60 siguen pendientes de la fase 8. Las recargas de Stripe se implementarán en la fase 9. No se han añadido cobros reales ni se ha desplegado en el VPS.

También se corrige la segunda generación de una vista previa lista: el visor se vuelve a montar, muestra las dos páginas y permite confirmar la revisión de nuevo. La generación sigue sin consumir KC.

## Interfaz y entrega local

Se ha comprobado el flujo con una cuenta ficticia en un frontal temporal separado de la sesión del usuario: bienvenida de 10 KC, BRIE de 2 KC, CIE de 5 KC y saldo final de 3 KC. Los movimientos se muestran en ES/CA. La casilla se activa con Espacio y el botón permanece deshabilitado hasta mostrar ambas páginas y confirmar la revisión. En móvil de 320 px el contenido mide 305 px, sin desbordamiento horizontal.

El documento cerrado no muestra campos editables. La descarga obtenida desde el navegador tiene dos páginas estáticas y coincide por SHA-256 con el registro privado validado. No se ha enviado una impresión física; se comprueba la ruta inline para abrir el PDF. El frontal temporal está detenido y su pestaña cerrada; la aplicación principal permanece en `http://127.0.0.1:3000`.

Las capturas actuales son `wallet-es.png`, `wallet-mobile-ca.png`, `brie-closed-mobile-ca.png`, `cie-review-mobile-ca.png` y `cie-closed-es.png`. Se conserva la captura anterior de la casilla sobredimensionada como `brie-review-before-checkbox-fix.png`, ya corregida. La descarga ficticia está en `evidence/phase-6/cie-ui-final.pdf`.

## Reproducción

Con los servicios locales de acceso existentes y sus claves conservadas:

```sh
node scripts/init-credit-key.mjs
sh scripts/apply-access.sh
docker build --target web -t boletinexpress-web:phase1 .
docker build --target worker -t boletinexpress-worker:phase1 .
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml up --detach --wait
docker compose -f compose.yaml -f compose.auth.yaml up --detach --wait
npm run check
node scripts/test-phase6.mjs
```

La configuración reproducible desde cero se ejecuta en CI. No se debe repetir el generador de credenciales base sobre una instalación existente ni eliminar volúmenes. Las pruebas de fase 6 crean cuentas y documentos ficticios exclusivos. Las credenciales locales no se versionan.

## CI y cierre

La ejecución [39077607312](https://github.com/FranMore68/BoletinExpress/actions/runs/39077607312) ha terminado correctamente en 16 minutos y 44 segundos. Corresponde al código final `54718ed66e2f56d541e20b7c86464c4b2a4cab0f`, incluida la corrección de la segunda revisión del PDF. Han pasado 25 pruebas de aplicación, 43 pruebas PDF, 267 casos de catálogo y 39 grupos de integración: acceso 12, BRIE 8, CIE 8 y créditos 11.

Se han descargado y comprobado los informes originales: cuatro baterías de integración, el catálogo y nueve auditorías de imágenes, conservados en `evidence/phase-6/ci/`. El resumen está en `ci-summary.json` y el estado completo de la ejecución en `ci-run.json`. Los avisos de GitHub sobre el runtime de upload-artifact y la próxima migración de ubuntu-latest son observaciones de mantenimiento; no han causado fallos.

Fallos funcionales pendientes detectados en esta fase: ninguno. Quedan registradas las observaciones sobre 30 avisos moderados de Storage, la cobertura limitada de la imagen estática de PostgREST y la prueba de capacidad del VPS de fase 10. La fase 7 no se ha iniciado y requiere aceptar este cierre.
