# Fase 7 — comprobación inicial de OpenAI

Prueba del 18/10/2026, anterior a la integración funcional. Datos inventados y audio sintético.

| Prueba | Resultado final | Evidencia |
|---|---|---|
| Texto con salida estructurada | HTTP 200; datos y esquema correctos | `openai.json` |
| Imagen con salida estructurada | HTTP 200; datos y esquema correctos | `openai.json` |
| Transcripción de audio | HTTP 200; contenido ficticio esperado | `openai.json` |

La clave permanece en `.secrets/openai.env` (ignorado, 0600), solo accesible al worker. Modelos: gpt-6-luna y whisper-1. Responses utiliza `store:false`, que no elimina toda retención del proveedor.

Los primeros intentos de Whisper devolvieron `missing_scope api.model.audio.request`. Text-to-speech Request no bastó. Después de que el usuario activara Model capabilities Request, la transcripción fue correcta. El asistente no modificó permisos.

Usage mostraba cero peticiones y tokens pese a las respuestas correctas de API. Se comprobó el proyecto BoletinExpress-evaluacion y la coincidencia de la clave por su sufijo. La causa del desfase no está confirmada (`usage-dashboard.json`). Las respuestas registraron 1141 tokens de entrada y 64 de salida en aquellas dos llamadas; no representan el consumo completo de fase 7.

El cierre funcional y sus pruebas posteriores están en `docs/fase-7.md` y `evidence/phase-7/status.json`.
