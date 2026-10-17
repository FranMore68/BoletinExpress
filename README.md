# BoletinExpress

Aplicación prevista para preparar BRIE y CIE ELEC-1 con revisión humana, interfaz ES/CA y datos ficticios durante la evaluación.

**Estado actual: fases 0 a 4 aceptadas; fase 5 completada técnicamente y pendiente de aceptación.** El formulario CIE ELEC-1 integra sus 70 campos y variantes, reutiliza el perfil profesional y comparte el worker privado con BRIE. La fase 6 no ha comenzado. Véase [el informe de fase 5](docs/fase-5.md).

El entorno local está disponible en `http://127.0.0.1:3000/acceso?lang=es`; los correos de evaluación se capturan en `http://127.0.0.1:54324`. El VPS y Control-Contracts-ATC no se han modificado. CI ha superado 22 pruebas de aplicación, 43 pruebas PDF, 267 casos de catálogo y 28 grupos de integración. Nueve imágenes sin avisos altos ni críticos.

El [perfil reutilizable del electricista](docs/perfil-electricista.md) permite copiar los datos profesionales a un nuevo BRIE o CIE. Los cambios del perfil se aplican a documentos nuevos y no alteran los anteriores.

- [Interfaz ES/CA y pruebas de fase 2](docs/fase-2.md)
- [Base técnica y pruebas de fase 1](docs/fase-1.md)
- [Reproducir los contenedores](infra/README.md)
- [Cierre técnico de fase 0 y evidencias actuales](docs/fase-0-cierre.md)
- [Diagnóstico histórico de fase 0](docs/fase-0.md)
- [Actualización del CIE estático: muestras y pruebas del 16/10/2026](docs/fase-0-cie-estatico.md)
- [Reproducción de las pruebas PDF](tools/pdf-phase0/README.md)
- [BRIE de prueba](output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf)

El generador no escribe en `plantillas`; las huellas actuales están registradas en `evidence/phase-0/sha256-2026-10-16.json`. Los datos de las pruebas son inventados expresamente para evaluar el programa. El CIE de diagnóstico en `evidence` no es una plantilla aprobada.
