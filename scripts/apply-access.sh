#!/bin/sh
set -eu
# Ejecutar una vez después de las migraciones de Auth y Storage.
for attempt in $(seq 1 60); do
  if docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U postgres -d postgres -tAc "select to_regclass('auth.sessions') is not null and to_regclass('storage.objects') is not null" | tr -d ' \r\n' | grep -qx t; then break; fi
  if [ "$attempt" -eq 60 ]; then echo 'Auth/Storage no han completado sus migraciones'; exit 1; fi
  sleep 2
done
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d postgres < infra/supabase/001-access.sql
