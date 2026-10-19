# BoletinExpress

Aplicación prevista para preparar BRIE y CIE ELEC-1 con revisión humana, interfaz ES/CA y datos ficticios durante la evaluación.

**Estado actual: fases 0 a 10 cerradas y aceptadas. La fase 10 fue aceptada el 19 de octubre de 2026; la aplicación sigue activa durante la evaluación.** La web está disponible en [boletinexpress.moremaker3d.cloud](https://boletinexpress.moremaker3d.cloud), con datos ficticios y Stripe en pruebas. El registro remoto es independiente del local. Resultados y límites en [fase 10](docs/fase-10.md); [reproducción y retirada](docs/reproduccion-y-retirada.md).

La [fase 8](docs/fase-8.md) incorpora los vencimientos de 24 horas, archivo al día 30, reenvío al propio correo y eliminación al día 60. La [fase 7](docs/fase-7.md) añade propuestas revisables desde texto, foto y voz. La [fase 9](docs/fase-9.md) incorpora recargas de prueba con abono transaccional por webhook. Las claves de cobro real se rechazan.

El entorno local usa `http://127.0.0.1:3000/acceso?lang=es` y un buzón de evaluación en `http://127.0.0.1:54324`. En el VPS solo se ha modificado el recurso exclusivo de BoletinExpress. El usuario confirmó que Control-Contracts-ATC respondía como antes durante la carga; no se midió su latencia ni se accedió a otros proyectos.

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
