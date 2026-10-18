# Revisión previa a publicación — fase 8

Alcance: diff respecto de `ef35733`, migración 005, API y políticas de acceso, cola de correo, worker, reloj local, interfaz ES/CA, pruebas y configuración de CI. Se aplica la skill `pre-commit-security-review`.

## Hallazgos

- Medio, integración externa pendiente: el transporte Resend se prueba con peticiones simuladas. El usuario ha elegido explícitamente Mailpit local. Antes del despliegue hay que verificar dominio, secretos y entrega real; la aceptación por API no demuestra entrega al destinatario.
- Bajo, garantía de entrega local: Mailpit no ofrece la idempotencia de Resend. Una caída entre aceptación y confirmación del trabajo puede repetir una copia ficticia; no produce cobros. La cola mantiene un único trabajo por solicitud y el proveedor Resend recibe la misma clave en reintentos. Los reintentos se detienen antes de superar la ventana documentada de 24 horas.
- Bajo, pruebas de tiempo: avanzar el reloj documental no salta límites reales de Auth, leases, comprobantes ni correo. La batería envejece explícitamente una fila ficticia de correo para simular una solicitud posterior; no modifica cuentas existentes para ese ensayo.
- Observaciones confirmadas en la CI final: 30 avisos moderados de Storage y cobertura limitada de PostgREST, cuya imagen estática carece de inventario para Trivy. No se detectan altas ni críticas en las nueve imágenes analizadas. No se han cambiado dependencias ni imágenes base en esta fase. Las auditorías npm locales de aplicación y worker comunican cero vulnerabilidades.

## Hallazgo corregido antes del cierre

Una reserva cancelada tras subir podía dejar un objeto sin fila de archivo. Se sustituye `cancel_file` para bloquear primero el documento, encolar siempre el objeto y eliminar la reserva en la misma transacción. El alta de objetos usa el mismo bloqueo, por lo que no puede aparecer una carga tardía después de cancelar. La finalización también toma primero el bloqueo del documento para evitar invertir el orden con cancelación y validación. Una prueba directa de Storage comprueba la cancelación, la concurrencia entre finalizar y cancelar y el borrado físico.

## Comprobaciones y correcciones

- Sesión y propietario en todas las rutas; `Origin` en las escrituras; entradas limitadas a campos previstos. El navegador no elige destinatario, plazos, créditos ni estado del correo.
- RLS restrictiva bloquea también acceso directo a datos y objetos vencidos aunque el worker esté detenido. Las funciones de generación comprueban vencimiento incluso al reutilizar un trabajo existente.
- Renovación y validación toman cuenta y documento en ese orden. Importe fijo y operación única por ciclo; los movimientos no se escriben desde clientes.
- Los trabajos tienen claim, lease y reintentos persistentes. Una nueva autorización de envío comprueba vigencia, claim y correo confirmado inmediatamente antes de llamar al transporte.
- PDF comprobado por hash; no hay enlaces públicos ni firmados. Día 60 elimina las filas de correo y encola la eliminación física sin ampliar el acceso.
- Reloj sin endpoint ni permisos de aplicación, limitado por trigger a cuentas ficticias confirmadas y avance monótono. El comando exige entorno local de evaluación.
- Secretos solo en `.secrets` excluida. Logs con códigos técnicos; no incluyen PDF, campos, transcripciones ni destinatarios. No se han añadido dependencias.
- Migración aplicada localmente y transaccional; instalación desde cero y 51 grupos de integración superados en CI 39108937933. No se modifican volúmenes ni servicios del VPS.

Corrección rápida pendiente para despliegue: configurar Resend y comprobar entrega real. No impide el piloto local solicitado. Las comprobaciones de CI han superado el umbral alto/crítico.

Riesgo: acotado al piloto local con datos ficticios; la entrega externa sigue sin verificar.

APTO CON OBSERVACIONES
