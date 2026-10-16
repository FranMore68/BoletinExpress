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
COPY infra/supabase/roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql

FROM supabase/storage-api:v1.83.5 AS storage
USER root
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn*
