#!/bin/sh
set -eu
# Una migración ya aplicada se conserva; no se recrean políticas ni datos.
if [ "$(docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select version from private.schema_migrations where version='001-access'" 2>/dev/null || true)" = "001-access" ]; then
  echo '001-access ya aplicada'
else
# Ejecutar una vez después de las migraciones de Auth y Storage.
for attempt in $(seq 1 60); do
  if docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select to_regclass('auth.sessions') is not null and to_regclass('storage.objects') is not null" | tr -d ' \r\n' | grep -qx t; then break; fi
  if [ "$attempt" -eq 60 ]; then echo 'Auth/Storage no han completado sus migraciones'; exit 1; fi
  sleep 2
done
docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < infra/supabase/001-access.sql
fi
# La fase 4 se añade sin repetir ni modificar la migración de acceso ya aplicada.
if [ "$(docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select version from private.schema_migrations where version='002-brie'" 2>/dev/null || true)" = "002-brie" ]; then
  echo '002-brie ya aplicada'
else
  docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < infra/supabase/002-brie.sql
fi
# La fase 5 amplía la misma cola sin recrear tablas ni claves existentes.
if [ "$(docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select version from private.schema_migrations where version='003-cie'" 2>/dev/null || true)" = "003-cie" ]; then
  echo '003-cie ya aplicada'
else
  docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < infra/supabase/003-cie.sql
fi

if [ "$(docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -U supabase_admin -d postgres -tAc "select version from private.schema_migrations where version='004-credits'" 2>/dev/null || true)" = "004-credits" ]; then
  echo '004-credits ya aplicada'
else
  docker compose --env-file .secrets/supabase.env -f infra/supabase/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < infra/supabase/004-credits.sql
fi
