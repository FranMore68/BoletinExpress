# BoletinExpress

Aplicación prevista para preparar BRIE y CIE ELEC-1 con revisión humana, interfaz ES/CA y datos ficticios durante la evaluación.

**Estado actual: fase 0 aceptada; fase 1 en comprobación.** Base Next.js, worker, contenedores y CI preparados. La interfaz ES/CA y el recorrido guiado corresponden a la fase 2.

- [Base técnica y pruebas de fase 1](docs/fase-1.md)
- [Reproducir los contenedores](infra/README.md)
- [Cierre técnico de fase 0 y evidencias actuales](docs/fase-0-cierre.md)
- [Diagnóstico histórico de fase 0](docs/fase-0.md)
- [Actualización del CIE estático: muestras y pruebas del 16/10/2026](docs/fase-0-cie-estatico.md)
- [Reproducción de las pruebas PDF](tools/pdf-phase0/README.md)
- [BRIE de prueba](output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf)

El generador no escribe en `plantillas`; las huellas actuales están registradas en `evidence/phase-0/sha256-2026-10-16.json`. Los datos de las pruebas son inventados expresamente para evaluar el programa. El CIE de diagnóstico en `evidence` no es una plantilla aprobada.
