# Imagen experimental: no sustituye el target auth ni su etiqueta actual.
FROM golang:1.27.2-alpine3.24@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS build
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
RUN apk add --no-cache make git
ADD --checksum=sha256:d21291c281604ccc6272c81c6506c8d521bc38d3141b0d339cb1a5988b1d461d https://codeload.github.com/supabase/auth/tar.gz/refs/tags/v2.197.0 /tmp/auth.tar.gz
WORKDIR /source
RUN tar xzf /tmp/auth.tar.gz --strip-components=1 -C /source
RUN sed -i 's|"github.com/jackc/pgconn"|"github.com/jackc/pgx/v5/pgconn"|' internal/utilities/postgres.go internal/hooks/hookspgfunc/hookspgfunc_test.go
COPY infra/supabase/auth-candidate/go.mod infra/supabase/auth-candidate/go.sum ./
RUN go mod download && go mod verify
# No aceptar una imagen que aún incorpore la rama vulnerable por otra vía.
RUN go list -m all > /source/candidate-modules.txt && ! grep -E '^github.com/jackc/(pgproto3/v2|pgconn|pgx/v4|pgtype) ' /source/candidate-modules.txt
COPY infra/supabase/auth-candidate/migration_test.go internal/utilities/boletin_migration_test.go
RUN go test -v ./internal/crypto ./internal/conf ./internal/utilities
RUN go build -o auth -buildvcs=false -ldflags '-X github.com/supabase/auth/internal/utilities.Version=v2.197.0-be-pgx5-candidate'
RUN go version -m /source/auth > /source/candidate-binary-modules.txt && ! grep -E 'github.com/jackc/(pgproto3/v2|pgconn|pgx/v4|pgtype)[[:space:]]' /source/candidate-binary-modules.txt

FROM supabase/gotrue:v2.197.0 AS candidate
USER root
RUN apk add --no-cache --upgrade libcrypto3=3.5.9-r0 libssl3=3.5.9-r0
COPY --from=build /source/auth /usr/local/bin/auth
COPY --from=build /source/LICENSE /usr/share/licenses/boletinexpress-auth/LICENSE
COPY --from=build /source/go.mod /source/go.sum /source/candidate-modules.txt /source/candidate-binary-modules.txt /usr/share/boletinexpress-candidate/
USER supabase
