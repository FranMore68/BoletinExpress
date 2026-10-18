# Revisión previa a publicación — fase 9

Alcance: cambios respecto de `acab81e`, migración 006, credencial RPC de pagos, Checkout alojado, webhook, interfaz ES/CA, detector de secretos, batería de integración y CI. Se aplica `pre-commit-security-review`.

## Hallazgos

- Medio, validación externa pendiente: los flujos de Stripe se han ensayado con respuestas simuladas en un proceso aislado. Las firmas, los endpoints y las transacciones sí se ejecutan con la aplicación y PostgreSQL locales. Falta comprobar la API y Checkout de una cuenta Stripe real en modo pruebas, sus claves, el listener/endpoint y los casos aprobado, rechazado, cancelado y evento repetido. Esta limitación impide cerrar la fase 9 o desplegar pagos; no impide conservar y publicar el código del piloto con los botones desactivados.
- Bajo, estados de compra: cancelar el retorno no declara fallido un pago, porque el webhook podría llegar más tarde. Las compras sin pagar permanecen pendientes hasta recibir el estado correspondiente de Stripe. Se conserva la cuenta y se permite actualizar saldo e historial.
- Bajo, no se han añadido dependencias ni cambiado las imágenes base. La auditoría actual de npm de la aplicación comunica cero vulnerabilidades. Trivy analiza la imagen web final con la base pública actualizada el 18/10/2026 y no detecta avisos altos ni críticos. Se utiliza el analizador fijado ya instalado porque la descarga mediante Docker se detuvo esperando las credenciales del llavero; no se omite la actualización de su base de avisos. Los avisos moderados de Storage y la limitación de cobertura de PostgREST registrados en fase 8 siguen pendientes; esta fase modifica únicamente la imagen web y la migración aditiva.

## Comprobaciones y correcciones

- Credencial de pagos separada de créditos y worker. No obtiene escrituras directas en tablas. Las funciones revocan permisos públicos y comprueban el rol explícitamente. La creación confirma que la sesión pertenece al usuario y sigue activa.
- RLS y selección de columnas separan compras entre cuentas y ocultan referencias Stripe. El navegador no determina precio, créditos, propietario ni URL de retorno. La URL de Checkout solo admite HTTPS en el host oficial.
- La ruta de creación comprueba origen y sesión. El webhook autentica el cuerpo original con HMAC y comparación temporal segura; no confía en cookies, en `Origin` ni en los importes incluidos en el aviso. Tamaño máximo de 64 KiB y reloj real con tolerancia de 300 segundos.
- La consulta a Stripe valida sesión, modo, moneda, importe, cantidad, precio y referencias; únicamente `payment_status=paid` puede abonar KC. Claves y eventos reales se rechazan de forma explícita.
- Orden de bloqueos cuenta→compra, compartido con el orden de validación y renovación. Evento, sesión, PaymentIntent y movimiento deduplicados. El abono y el registro se confirman juntos; una excepción revierte toda la operación.
- Sesión creada con clave de idempotencia estable y parámetros persistentes. Se admite pago anterior al guardado de la sesión. La recuperación de respuestas perdidas no crea compras ni cobros adicionales. Las firmas y las cuotas no utilizan el reloj ficticio de documentos.
- La disponibilidad de Checkout exige también un secreto de webhook con la misma validación mínima que el receptor, evitando activarlo con un prefijo vacío.
- Secretos en `.secrets`, fuera de Git y del contexto Docker. Transporte simulado solo mediante un preload explícito en un proceso de pruebas; no se incluye en la imagen ni se activa desde rutas o variables de la aplicación.
- Migración transaccional aplicada sin recrear datos. Regresiones de créditos y conservación superadas. El VPS y las otras aplicaciones no se modifican.

Corrección rápida pendiente para completar la evaluación: configurar Stripe en modo pruebas desde el Mac y ejecutar el recorrido externo descrito en `docs/fase-9.md`. Las claves no se solicitan por el chat.

Riesgo: acotado a código del piloto con pagos desactivados; la integración externa permanece sin verificar y la fase no se declara cerrada.

APTO CON OBSERVACIONES
