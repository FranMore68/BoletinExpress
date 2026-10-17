# Contenedores de evaluación

La fase 1 prepara y prueba `web` y `worker` localmente. No instala servicios en el VPS.

- Base oficial Node 24 Alpine fijada por digest en `Dockerfile`.
- Ejecución como usuario `node`, sistema de archivos de solo lectura, directorio temporal con límite, capacidades eliminadas y sin privilegios nuevos.
- Puerto web publicado exclusivamente en 127.0.0.1; worker sin puertos publicados.
- Red exclusiva `boletinexpress-evaluation`, sin compartir servicios de otras aplicaciones.
- Web: 512 MiB y 0,5 CPU; worker: 256 MiB y 0,25 CPU. Total de esta fase: 768 MiB y 0,75 CPU.
- Del presupuesto conjunto de 3072 MiB y 1 CPU quedan 2304 MiB y 0,25 CPU para los servicios de datos. Es una reserva de configuración; su viabilidad se medirá antes del despliegue.

Supabase dedicado, acceso y Storage privado están implementados en la fase 3. La fase 4 añade la cola PostgreSQL y el generador BRIE; la fase 5 añade CIE sobre la misma cola. Con `compose.auth.yaml` y `.secrets/worker.env`, el worker indica `jobsEnabled: true`; sin esa configuración solo expone liveness. Véanse [la fase 3](../docs/fase-3.md) y [la fase 4](../docs/fase-4.md) para reproducir el entorno integrado. El conjunto configura 3008 MiB y 1 CPU.

## Reproducir desde la raíz

Con Node 24.22.0, npm y Docker:

```sh
npm ci --ignore-scripts
npm audit --audit-level=high
npm run check
npm run build
docker build --target web -t boletinexpress-web:phase1 .
docker build --target worker -t boletinexpress-worker:phase1 .
sh scripts/scan-images.sh
docker compose up --detach --wait
node scripts/smoke.mjs
```

Abrir http://127.0.0.1:3000. La pantalla es provisional de infraestructura; la interfaz ES/CA corresponde a la fase 2.

```sh
docker compose down
```

Ese comando detiene los servicios de este proyecto. No elimina volúmenes. La base pública de Trivy se conserva en el volumen exclusivo `boletinexpress-trivy-cache`; el análisis de imágenes se ejecuta sin red. Los archivos se copian por la API local de Docker y no se envían a un servicio de análisis externo.

Las imágenes se construirán en CI o en el equipo de desarrollo. En el VPS/Coolify se referenciarán imágenes publicadas con digest mediante `BOLETINEXPRESS_WEB_IMAGE` y `BOLETINEXPRESS_WORKER_IMAGE`; no ejecutar las construcciones en el VPS compartido. La publicación y el despliegue pertenecen a la fase 10. No se modifica Control-Contracts-ATC.

`/api/health` y `/health` del worker comprueban solo que sus procesos responden; no afirman que Auth, base de datos o proveedores estén configurados.
