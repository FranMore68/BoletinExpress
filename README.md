# BoletinExpress

Aplicación prevista para preparar BRIE y CIE ELEC-1 con revisión humana, interfaz ES/CA y datos ficticios durante la evaluación.

**Estado actual: fases 0 a 6, 8 y 9 aceptadas; fase 7 verificada y pendiente de aceptación.** Se incorporan renovación transaccional de borradores, vencimientos de 24 horas, archivo al día 30, reenvío al propio correo y eliminación al día 60, con reloj protegido para cuentas ficticias. Véase [el informe de fase 8](docs/fase-8.md). La fase 7 incorpora propuestas revisables desde texto, foto y voz; véase [el informe](docs/fase-7.md). La fase 10 espera su aceptación.

El entorno local está disponible en `http://127.0.0.1:3000/acceso?lang=es`; las cuentas ficticias `.invalid` usan el buzón local en `http://127.0.0.1:54324`. Resend está activo y comprobado para los correos de acceso y los documentos destinados a direcciones reales de evaluación. El VPS y Control-Contracts-ATC no se han modificado. La [CI final de fase 9](https://github.com/FranMore68/BoletinExpress/actions/runs/39144803728) supera 33 pruebas de aplicación, 43 pruebas PDF, 267 casos de catálogo y 67 grupos de integración. Diez imágenes analizadas, incluido el CLI local de Stripe, sin avisos altos ni críticos detectados; las limitaciones de cobertura y los 30 avisos moderados de Storage están documentados en el informe.

La [fase 9](docs/fase-9.md) añade recargas de prueba y abono transaccional por webhook. Sus botones permanecen desactivados hasta configurar los secretos de Stripe; no admite claves de cobros reales.

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
