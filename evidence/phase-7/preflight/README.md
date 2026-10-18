# Fase 7 — comprobación inicial de OpenAI

Comprobación con datos ficticios del 18/10/2026. No está implementada todavía la integración funcional de extracción de la aplicación.

| Prueba | Resultado | Evidencia |
|---|---|---|
| text_structured_extraction | 200; campos esperados y esquema correctos | `openai.json` |
| image_structured_extraction | 200; campos esperados y esquema correctos | `openai.json` |
| audio_transcription | 401; missing_scope | `openai.json` |

La clave está en el archivo privado ignorado `.secrets/openai.env` con permisos 0600. No se incluyen la clave, las respuestas completas ni el contenido de fuentes en los registros. Las peticiones Responses usan `store:false`; esto no elimina por sí solo la retención del proveedor. Solo se enviaron casos inventados y un audio sintético.

Acceso externo verificado: las tres pruebas son correctas. Los intentos iniciales de transcripción devolvieron HTTP 401 con missing_scope api.model.audio.request. Después de que el usuario activara Model capabilities Request, la transcripción devuelve HTTP 200 y contiene los datos ficticios esperados. El asistente no ha modificado permisos ni cambiado de modelo.

Modelos previstos: gpt-6-luna para texto y fotografía; whisper-1 para voz. Este documento no da por cerrada la fase 7.

## Comprobación del panel

El usuario guardó Text-to-speech en Request. Se confirmó ese valor en la UI de la misma clave usada (coincidencia del sufijo), sin modificar permisos. Tras dar margen a la propagación, la transcripción sigue devolviendo missing_scope api.model.audio.request. El selector de grupo Model capabilities ofrece Request y None; actualmente figura Mixed. No se ha activado el grupo completo porque ampliaría el acceso a otras capacidades de modelos.

Usage sigue mostrando cero peticiones y tokens al actualizar y consultar el mes actual, con el proyecto BoletinExpress-evaluacion y todas las claves/fuentes seleccionadas. El registro de respuestas de API conserva dos llamadas correctas, 1141 tokens de entrada y 64 de salida. La causa del desfase del panel no está confirmada. Véase usage-dashboard.json.

## Resultado tras activar el grupo

El usuario ha aplicado Model capabilities Request. Se repite solo la prueba de audio: HTTP 200, transcripción no vacía y datos ficticios Cliente Ficticio y Barcelona reconocidos. Las tres comprobaciones externas quedan superadas. Esto verifica acceso y permisos; no constituye el cierre funcional de la fase 7.
