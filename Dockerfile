FROM node:24-alpine@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS build
COPY next.config.ts tsconfig.json next-env.d.ts postcss.config.mjs ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn*
USER node

FROM runtime AS web
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

FROM runtime AS worker
COPY --chown=node:node worker ./worker
EXPOSE 3001
CMD ["node", "worker/index.mjs"]

FROM runtime AS gateway
COPY --chown=node:node infra/supabase/gateway.mjs ./gateway.mjs
EXPOSE 8000
CMD ["node", "gateway.mjs"]

FROM runtime AS templates
COPY --chown=node:node infra/supabase/templates.mjs infra/supabase/confirmation.html infra/supabase/recovery.html ./
EXPOSE 8080
CMD ["node", "templates.mjs"]

FROM supabase/postgres:17.11.0.004 AS database
RUN apk add --no-cache su-exec=0.3-r0 && rm /usr/local/bin/gosu
# Capa de borrado independiente: el escáner debe retirar también el binario Go heredado.
RUN printf '#!/bin/sh\nexec /sbin/su-exec "$@"\n' > /usr/local/bin/gosu && chmod 755 /usr/local/bin/gosu
COPY infra/supabase/roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql

FROM supabase/storage-api:v1.83.5 AS storage
USER root
COPY infra/supabase/storage-runtime/package.json infra/supabase/storage-runtime/package-lock.json /app/
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn*

FROM golang:1.27.2-alpine3.24@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS auth-build
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
RUN apk add --no-cache make git
ADD --checksum=sha256:d21291c281604ccc6272c81c6506c8d521bc38d3141b0d339cb1a5988b1d461d https://codeload.github.com/supabase/auth/tar.gz/refs/tags/v2.197.0 /tmp/auth.tar.gz
WORKDIR /source
RUN tar xzf /tmp/auth.tar.gz --strip-components=1 -C /source
RUN sed -i 's|"github.com/jackc/pgconn"|"github.com/jackc/pgx/v5/pgconn"|' internal/utilities/postgres.go internal/hooks/hookspgfunc/hookspgfunc_test.go
COPY infra/supabase/auth-runtime/go.mod infra/supabase/auth-runtime/go.sum ./
RUN go mod download && go mod verify
RUN go list -m all > /source/auth-modules.txt && ! grep -E '^github.com/jackc/(pgproto3/v2|pgconn|pgx/v4|pgtype) ' /source/auth-modules.txt
COPY infra/supabase/auth-runtime/migration_test.go internal/utilities/boletin_migration_test.go
RUN go test -v ./internal/crypto ./internal/conf ./internal/utilities
RUN go build -o auth -buildvcs=false -ldflags '-X github.com/supabase/auth/internal/utilities.Version=v2.197.0-be2-pgx5'
RUN go version -m /source/auth > /source/auth-binary-modules.txt && ! grep -E 'github.com/jackc/(pgproto3/v2|pgconn|pgx/v4|pgtype)[[:space:]]' /source/auth-binary-modules.txt

FROM supabase/gotrue:v2.197.0 AS auth
USER root
RUN apk add --no-cache --upgrade libcrypto3=3.5.9-r0 libssl3=3.5.9-r0
COPY --from=auth-build /source/auth /usr/local/bin/auth
COPY --from=auth-build /source/LICENSE /usr/share/licenses/boletinexpress-auth/LICENSE
COPY --from=auth-build /source/go.mod /source/go.sum /source/auth-modules.txt /source/auth-binary-modules.txt /usr/share/boletinexpress-auth/
USER supabase
