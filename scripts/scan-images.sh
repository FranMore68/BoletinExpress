#!/bin/sh
set -eu
scanner='aquasec/trivy@sha256:2416d1f74045b57274df1a340eee6b510cacd73c66a6ccb8da092b117eb7d222'
archives=$(mktemp -d)
container=''
cleanup() {
  if [ -n "$container" ]; then docker rm -f "$container" >/dev/null; fi
  rm -rf "$archives"
}
trap cleanup EXIT
report_dir=${BE_SCAN_REPORT_DIR:-evidence/phase-1}
mkdir -p "$report_dir"
docker pull "$scanner"
docker volume create boletinexpress-trivy-cache >/dev/null
# Este contenedor solo descarga la base publica; no recibe imagenes del proyecto.
container=$(docker create --mount type=volume,source=boletinexpress-trivy-cache,target=/root/.cache/trivy "$scanner" image --download-db-only)
docker start "$container" >/dev/null
docker wait "$container" >/dev/null
docker logs "$container"
code=$(docker inspect --format '{{.State.ExitCode}}' "$container")
if [ "$code" -ne 0 ]; then exit "$code"; fi
docker rm "$container" >/dev/null
container=''
failed=0
for service in ${BE_SCAN_SERVICES:-web worker}; do
  docker image save "boletinexpress-$service:phase1" --output "$archives/$service.tar"
  # Sin red durante el analisis. Copias por API local, sin montar el proyecto.
  container=$(docker create --network none --mount type=volume,source=boletinexpress-trivy-cache,target=/root/.cache/trivy "$scanner" image --input /tmp/image.tar --scanners vuln --skip-db-update --skip-java-db-update --offline-scan --severity HIGH,CRITICAL --exit-code 1 --format json --output /tmp/report.json)
  docker cp "$archives/$service.tar" "$container:/tmp/image.tar"
  docker start "$container" >/dev/null
  docker wait "$container" >/dev/null
  docker logs "$container"
  docker cp "$container:/tmp/report.json" "$report_dir/image-$service.json"
  code=$(docker inspect --format '{{.State.ExitCode}}' "$container")
  docker rm "$container" >/dev/null
  container=''
  if [ "$code" -ne 0 ]; then failed=1; fi
done
exit "$failed"
