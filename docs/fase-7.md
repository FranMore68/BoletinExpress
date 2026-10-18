# Fase 7 — extracción asistida de texto, fotografía y voz

Implementación local del 18/10/2026. Datos ficticios. Pendiente de aceptación del usuario y de completar las comprobaciones finales indicadas en `evidence/phase-7/status.json`. La fase 10 no se inicia automáticamente.

## Comportamiento

BRIE y CIE comparten el panel ES/CA de aportación. Se puede escribir, adjuntar una foto, abrir la cámara del dispositivo o grabar/subir audio. Las propuestas muestran el fragmento de origen y las dudas. Ningún dato entra en el formulario sin selección y confirmación de revisión. Los campos dudosos requieren introducción manual. El panel protege los valores existentes y los campos que se hayan corregido o vaciado manualmente. Una revisión antigua se rechaza en servidor. Aceptar propuestas invalida la vista previa anterior.

El catálogo de IA deriva de los formularios aprobados. Excluye datos profesionales, firmas, declaración y defectos; estos siguen siendo responsabilidad del electricista. «Todo OK» no equivale a mediciones ni certificación. Las fuentes se consideran contenido no fiable y nunca instrucciones. Las potencias sin unidad quedan pendientes incluso si el modelo las presenta como seguras.

Las fotografías se convierten en el navegador a una copia JPEG de hasta 2048 píxeles en su lado mayor, sin metadatos y con un máximo de 2 MiB. El original no se modifica. El audio se convierte localmente a WAV PCM mono de 16 kHz y 16 bits; el servidor calcula la duración a partir de los bytes y rechaza más de 60 segundos. La grabación se detiene a los 59 segundos. Si se deniega el micrófono, siguen disponibles texto y archivo de audio.

## Cuotas, acceso y conservación

Máximos por documento: diez extracciones, cinco fotos y cinco audios. Por cuenta y día UTC real: diez extracciones y 300 segundos de audio. Una solicitud nueva reserva cuota antes del trabajo externo; un fallo también consume esa reserva. El UUID estable de la operación evita volver a consumirla al reintentar. Hasta tres intentos internos, con lease; solo los fallos de transporte se reintentan automáticamente. El reloj ficticio de evaluación no altera la cuota diaria real.

La reserva usa una función con rol específico, sesión confirmada, bloqueo por cuenta y documento. Authenticated solo puede leer sus trabajos vivos y ejecutar operaciones limitadas. No puede crear cuotas ni cambiar resultados, propietarios o estados. Fuentes en bucket privado, sin reemplazo ni enlaces firmados. Su consulta pasa por una ruta autenticada con comprobación de propietario y vigencia.

El primer texto o archivo guardado inicia las 24 horas. Los sondeos automáticos no cuentan como regreso. PDF e IA comparten exclusión persistente: un único trabajo pesado simultáneo. Validar elimina trabajos, texto, transcripciones y propuestas, y encola el borrado físico de las fuentes. El vencimiento también las elimina. La reserva mínima sin contenido se conserva para impedir reinicios de cuota; se limpia cuando ya no existe el documento y han pasado dos días. El PDF final mantiene la conservación de la fase 8.

## Configuración y reproducción

1. Aplicar migraciones pendientes con `sh scripts/apply-access.sh` y generar el rol con `node scripts/init-extraction-key.mjs`.
2. Guardar `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL=gpt-6-luna` y `OPENAI_TRANSCRIPTION_MODEL=whisper-1` en `.secrets/openai.env` (0600). Nunca en código ni en el navegador. Solo el worker recibe esa clave.
3. Construir las imágenes web y worker del Dockerfile y levantar ambos con los archivos Compose del entorno local. No se modifica Storage ni otros proyectos.
4. Regenerar el catálogo si cambian los formularios: `node scripts/prepare-extraction-catalog.mjs`. Las pruebas detectan un catálogo desactualizado.
5. Ejecutar `npm run check` y `node scripts/test-phase7.mjs`. La integración usa cuentas `.invalid`, Storage real y resultados sintéticos de worker; no llama a OpenAI. La CI aplica la migración desde una base limpia y repite todas las fases anteriores.

Responses usa salida estructurada estricta y `store:false`. Esta opción no elimina por sí sola la retención del proveedor; el piloto sigue limitado a datos ficticios. Whisper-1 se mantiene para este piloto de 30 días según la decisión aprobada. Los logs contienen códigos de fallo, no fuentes ni respuestas completas. Las evidencias de prueba contienen únicamente datos ficticios.

## Evidencias y límites

| Prueba | Resultado | Evidencia |
|---|---|---|
| Acceso real a texto, imagen y Whisper | Superado | `evidence/phase-7/preflight/openai.json` |
| Foto manuscrita aportada | Superado: propuestas pendientes y dudas señaladas | `evidence/phase-7/real-note/results.json` |
| Aplicación selectiva en interfaz | Reus aceptado; los demás campos permanecen vacíos | `evidence/phase-7/real-note/propuestas-es.png` y registro UI |
| Aislamiento, cuotas, concurrencia, reintentos y limpieza | Consultar informe final | `evidence/phase-7/integration.json` |
| Texto CA y audio a través del worker | Consultar informe final | `evidence/phase-7/live-inputs.json` |
| Instalación limpia, regresiones y análisis de imágenes | Consultar CI final | `evidence/phase-7/status.json` |

La foto ha producido: calle incierta «C/ Pru[e]ba», número 7, piso/puerta inciertos «6-1º», Reus, tensión 400 y potencia «6'928» sin unidad. No ha completado resistencias, defectos ni firmas. No demuestra exactitud universal del reconocimiento; el electricista debe revisar cada dato.

La cámara y el micrófono dependen de los permisos y del hardware del dispositivo. Una prueba con archivo no acredita por sí sola la captura física de cámara/micrófono. El coste final debe consultarse en el panel del proveedor: el desfase observado entre Usage y las respuestas de API sigue sin causa confirmada.

La revisión automática rechazó ampliar el límite global de Storage y reiniciar ese servicio. Se resolvió optimizando las fotos y manteniendo el límite de 2 MiB; no se realizó la ampliación global.
