ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS deps
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm config set registry ${NPM_REGISTRY} && npm ci --no-audit --no-fund

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BRAND_NAME
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPPORT_PHONE
ARG NEXT_PUBLIC_ICE_SERVERS
ARG NEXT_PUBLIC_STAGING=false
ARG NEXT_PUBLIC_DEMO_MODE=false
# where the Next server reaches Django (baked into rewrites at build time; nginx normally routes /api itself)
ARG API_INTERNAL_URL=http://backend:8000
ENV NEXT_TELEMETRY_DISABLED=1 API_INTERNAL_URL=${API_INTERNAL_URL}
RUN npm run build

FROM ${NODE_IMAGE} AS run
WORKDIR /app
ARG API_INTERNAL_URL=http://backend:8000
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 API_INTERNAL_URL=${API_INTERNAL_URL}
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
