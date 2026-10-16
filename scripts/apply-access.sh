#!/bin/sh
set -eu
# Una migración ya aplicada se conserva; no se recrean políticas ni datos.
if [ "$(docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select version from private.schema_migrations where version='001-access'" 2>/dev/null || true)" = "001-access" ]; then
  echo '001-access ya aplicada'; exit 0
fi
# Ejecutar una vez después de las migraciones de Auth y Storage.
for attempt in $(seq 1 60); do
  if docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select to_regclass('auth.sessions') is not null and to_regclass('storage.objects') is not null" | tr -d ' \r\n' | grep -qx t; then break; fi
  if [ "$attempt" -eq 60 ]; then echo 'Auth/Storage no han completado sus migraciones'; exit 1; fi
  sleep 2
done
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < infra/supabase/001-access.sql
