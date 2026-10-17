# BoletinExpress

Aplicación prevista para preparar BRIE y CIE ELEC-1 con revisión humana, interfaz ES/CA y datos ficticios durante la evaluación.

**Estado actual: fases 0, 1 y 2 aceptadas; fase 3 con todas las comprobaciones superadas y pendiente de aceptación de cierre.** Registro, confirmación, recuperación y almacenamiento privado ES/CA implementados; 12 grupos de integración superados en Linux de CI y en los contenedores del Mac. Auth migrado a pgx/v5; nueve imágenes auditadas sin avisos altos o críticos. Docker Desktop está recuperado y el acceso completo local está disponible en `http://127.0.0.1:3000/acceso?lang=es`; los mensajes de confirmación y recuperación se capturan en `http://127.0.0.1:54324`. Véase [el informe de fase 3](docs/fase-3.md).

El [perfil reutilizable del electricista](docs/perfil-electricista.md) se incorpora al inicio de la fase 4 para autocompletar el BRIE y se reutiliza en el CIE de la fase 5. Los cambios del perfil se aplican a documentos nuevos y no alteran los anteriores.

- [Interfaz ES/CA y pruebas de fase 2](docs/fase-2.md)
- [Base técnica y pruebas de fase 1](docs/fase-1.md)
- [Reproducir los contenedores](infra/README.md)
- [Cierre técnico de fase 0 y evidencias actuales](docs/fase-0-cierre.md)
- [Diagnóstico histórico de fase 0](docs/fase-0.md)
- [Actualización del CIE estático: muestras y pruebas del 16/10/2026](docs/fase-0-cie-estatico.md)
- [Reproducción de las pruebas PDF](tools/pdf-phase0/README.md)
- [BRIE de prueba](output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf)

El generador no escribe en `plantillas`; las huellas actuales están registradas en `evidence/phase-0/sha256-2026-10-16.json`. Los datos de las pruebas son inventados expresamente para evaluar el programa. El CIE de diagnóstico en `evidence` no es una plantilla aprobada.
