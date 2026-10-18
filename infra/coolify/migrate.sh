#!/bin/sh
set -eu
# Solo se conecta al postgres del recurso. No recibe socket Docker ni rutas del host.
for file in /opt/boletinexpress/migrations/00*.sql; do
  version=$(basename "$file" .sql)
  exists=$(psql -X -v ON_ERROR_STOP=1 -Atc "select to_regclass('private.schema_migrations') is not null")
  if [ "$exists" = t ]; then
    applied=$(psql -X -v ON_ERROR_STOP=1 -Atc "select exists(select 1 from private.schema_migrations where version='$version')")
    if [ "$applied" = t ]; then
      echo "$version ya aplicada"
      continue
    fi
  fi
  psql -X -v ON_ERROR_STOP=1 -f "$file" > /dev/null
  echo "$version aplicada"
done
