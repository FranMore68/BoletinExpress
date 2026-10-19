# Revisión previa a publicación · fase 10

Alcance: adaptación Compose/cargador del commit `2c6e30e` y documentación/evidencias de despliegue. La entrega de imágenes corresponde a `fe0dfab`. No hay cambios adicionales de aplicación, dependencias, autenticación, SQL o migraciones en esta publicación documental.

## Hallazgos por severidad

- Bajo, cobertura: Trivy no inventaría todas las dependencias Haskell de PostgREST. Se conserva la limitación documentada en fase 7. CI y release no detectaron HIGH/CRITICAL en las imágenes analizadas; no se afirma ausencia de toda vulnerabilidad.
- Bajo, capacidad: CPU media 77,157 % con la carga acordada y límite de aceptación del 80 %. El VPS supera la prueba para esa concurrencia; no se extrapola a una carga mayor.
- Pendiente de aceptación: el usuario ha confirmado su registro, validación del correo y acceso remoto; queda aceptar la fase. No impide conservar las evidencias, pero no autoriza declarar la fase aceptada ni iniciar el borrado de datos.
- Corregido: el alias `SERVICE_KEY` generado antes de `SERVICE_ROLE_KEY` bloqueaba el arranque. Storage usa referencia sin guard en el alias, otros nueve servicios lo anulan y gateway mantiene el guard obligatorio. La regresión de orden y clave ausente pasa; el entorno remoto confirma la asignación correcta sin imprimir claves.
- Corregido antes de publicar imágenes: libexpat HIGH en Storage actualizado a 2.9.0-r0; CI y release posteriores correctas.

## Correcciones y validación

- CI final `39201187498` del commit `2c6e30e`: correcta, sin pasos fallidos; incluye regresión del alias, compilación, pruebas e integraciones. Evidencia `ci-final.json`.
- CI de imágenes `39175211828`: diez imágenes sin HIGH/CRITICAL. Release `39194683308`: nueve imágenes analizadas y siete paquetes propios privados publicados, construidos fuera del VPS.
- Descarga real por digest: nueve imágenes amd64; privacidad y repositorio verificados. PAT introducido por el usuario en entrada oculta y configuración Docker temporal retirada. Sin login global ni modificación de otro proyecto.
- Entornos de diez contenedores comprobados; 116 anulaciones, límites 3072 MiB / 1 CPU, redes/volúmenes exclusivos y cero puertos host. Nueve servicios permanentes y migrador salida 0. Solo web recibe la ruta pública al puerto 3000.
- HTTPS, aislamiento de dos cuentas, PDF revisados/validados, borrado de datos de trabajo, IA con propuestas pendientes y Stripe test con dos repeticiones sin doble abono: superados.
- Correo documental en buzón privado y autenticación SMTP Resend/TLS desde VPS correctos. La sonda no envió correo externo; el usuario ha confirmado el registro personal remoto y el acceso.
- Carga de 603,7 segundos: 20 PDF, CPU 77,157 %, mínimos 3,971 GiB de memoria y 55,742 GiB de disco; sin OOM/reinicios. El usuario observa Control-Contracts-ATC como antes, sin errores; no se accedió a ese proyecto.

## Riesgo y acciones

Mantener las anulaciones y el guard obligatorio al recrear el recurso. Revisar la vigencia de las claves si se prolonga la evaluación. Los secretos y contenido personal siguen excluidos de Git. Las capturas entregadas muestran datos ficticios o formularios vacíos. La guía de retirada exige confirmar el fin de la evaluación y verificar pertenencia antes de borrar los volúmenes exclusivos.

Riesgo: limitado al piloto y a la concurrencia comprobada; queda la aceptación del usuario, con la limitación de inventario de seguridad indicada.

APTO CON OBSERVACIONES
