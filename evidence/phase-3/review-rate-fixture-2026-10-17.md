# Revisión de la prueba de limitación de intentos

Alcance: exclusivamente el último grupo de `scripts/test-isolation.mjs`, con pre-commit-security-review. No hay cambios en la aplicación, el esquema ni la política de limitación.

Hallazgo: CI 39046688789 superó los once primeros grupos y falló `limited.includes(429)` al final. La prueba reutilizaba la clave del acceso de la cuenta B, de modo que podía cruzar la renovación de su ventana de un minuto durante los seis intentos secuenciales. El Mac había pasado la misma prueba con otro ritmo de ejecución.

Corrección: dirección ficticia nueva por ejecución y ráfaga concurrente de seis peticiones. La comprobación se refuerza: exige exactamente cinco respuestas 401 y una 429, sin depender del orden de llegada. El rechazo se comprueba a través de HTTP y de la cuota persistente real, sin sustituir el reloj de Auth ni cambiar sus reglas.

Validación estática: formato, TypeScript, trece pruebas unitarias y detector de secretos. El resultado local y CI de los doce grupos completos se guardará por separado.

No se introducen secretos, permisos o dependencias. Riesgo: fixture de evaluación aislada; sin efecto en el comportamiento desplegado.

APTO PARA COMMIT
