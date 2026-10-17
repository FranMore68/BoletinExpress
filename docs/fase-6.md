# Fase 6: créditos y validación documental

Estado: pruebas locales superadas; CI y cierre visual en comprobación. La fase 5 fue aceptada el 18/10/2026 mediante «ok vamos con la fase 6». La fase 7 requiere aceptar este cierre.

## Resultado

La cuenta muestra saldo y los últimos 50 movimientos. Se conceden 10 KC una sola vez después de confirmar el correo, también para las cuentas del piloto confirmadas antes de esta migración. Acceder de nuevo o repetir la confirmación no concede más créditos.

Generar y revisar una vista previa sigue siendo gratuito. Después de mostrar las dos páginas, el editor permite confirmar la revisión y validar con el coste visible: 2 KC para BRIE o 5 KC para CIE. La operación cierra el documento; el editor se sustituye por el PDF privado, su descarga y la apertura para imprimir. No implica firma ni comprobación normativa.

Una transacción bloquea primero la cuenta y después el documento, comprueba sesión, propietario, revisión, estado, PDF listo y saldo; descuenta el coste fijo, registra un movimiento único y cierra el documento. Los reintentos devuelven el cierre existente. El saldo no puede ser negativo y cada documento admite un solo cargo.

La revisión utiliza un comprobante HMAC de 30 minutos que vincula usuario, sesión, documento, revisión y SHA-256. El servidor lo emite después de verificar los bytes del PDF de dos páginas; vuelve a comprobarlos antes del cobro. La interfaz habilita la confirmación después de renderizar ambas páginas. Esto acredita qué archivo se entrega para revisar; la revisión humana se confirma expresamente mediante la casilla.

El rol de créditos del servidor solo puede ejecutar la operación de validación. No dispone de acceso administrativo, escritura directa en tablas ni capacidad de crear documentos. Los clientes y el worker no pueden ejecutar esa operación. Las descargas requieren sesión y propietario, sin enlaces públicos o firmados reutilizables.

El PDF validado conserva los mismos bytes y objeto inmutable que se revisó. Su registro final contiene revisión, SHA-256, coste, fecha y ruta privada. Al validar se vacían los datos de trabajo y se eliminan las filas de fuentes, cola y vistas previas. Una cola privada permite al worker borrar los objetos de fuentes y vistas previas anteriores con reintentos; el PDF final queda excluido. Se bloquean las altas de objetos frente al cierre para evitar cargas tardías. El perfil profesional se conserva para nuevos documentos.

## Pruebas y evidencias

| Prueba | Resultado | Evidencia |
|---|---|---|
| Concesión única, saldo e historial | Superado: 11 grupos de integración | `evidence/phase-6/integration.json` |
| Aislamiento, permisos y comprobante de revisión | Superado: 11 grupos de integración | `evidence/phase-6/integration.json` |
| Doble clic, concurrencia y reintentos | Superado: 11 grupos de integración | `evidence/phase-6/integration.json` |
| Cobro BRIE/CIE, saldo insuficiente y fallos de PDF | Superado: 11 grupos de integración | `evidence/phase-6/integration.json` |
| Documento cerrado, PDF idéntico y retirada de fuentes | Superado: 11 grupos de integración | `evidence/phase-6/integration.json` |
| Formato, tipos y 24 pruebas de aplicación | Superado | `evidence/phase-6/check.log` |
| Dependencias de aplicación y worker | Sin vulnerabilidades notificadas | `evidence/phase-6/audit-app.log`, `audit-worker.log` |
| Dependencias de Storage | Sin altas ni críticas; 30 avisos moderados | `evidence/phase-6/audit-storage.log` |
| Instalación desde cero y nueve imágenes | Pendiente de CI | Se añadirá el resultado verificado |
| Interfaz ES/CA | En comprobación | Se añadirán capturas y resultados |

## Incidencias resueltas y límites

El registro inicial agotó el plazo de Auth con 0,04 CPU y sin bloqueo de base de datos. Se redistribuye el mismo presupuesto conjunto de 1 CPU: La distribución final reserva 0,15 CPU para Auth, 0,10 para PostgreSQL y 0,34 para el frontal; mantiene las demás cuotas. No aumenta la memoria ni se modifican servicios del VPS. El registro posterior ha funcionado.

Los primeros ensayos de ocho validaciones simultáneas encontraron consultas a Auth que agotaron su plazo. Un fallo temporal de Auth se devuelve como 503 recuperable, sin indicar falsamente que la sesión ha caducado. El ensayo inicial conservado en `integration-before-final-budget.json` obtuvo ocho 503 recuperables y confirmó un cargo único al reintentar. No demuestra ocho validaciones simultáneas de negocio. La batería final comprueba por separado ocho transacciones simultáneas con el rol restringido (un único cargo), el doble clic HTTP y tres CIE concurrentes con 10 KC (dos cargos y un rechazo). Las mediciones de capacidad del VPS corresponden a la fase 10.

Los 30 avisos moderados de dependencias transitivas de Storage quedan registrados; no se actualizan indiscriminadamente dependencias del servicio durante esta fase. Una vulnerabilidad alta o crítica impediría cerrar la fase.

La retirada al día 30 se aplica al acceso directo al PDF. Correo, reenvío, reloj de evaluación, renovaciones y eliminación al día 60 siguen pendientes de la fase 8. Las recargas de Stripe se implementarán en la fase 9. No se han añadido cobros reales ni se ha desplegado en el VPS.

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
