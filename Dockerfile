# ---------- Etapa 1: compilar TypeScript ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------- Etapa 2: imagen final ----------
FROM node:22-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    AUTH_DIR=/app/auth \
    DATA_DIR=/app/data \
    TMP_DIR=/tmp/musicbot

# FFmpeg para convertir el audio y yt-dlp (binario oficial) para buscar y descargar
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 ca-certificates curl \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get purge -y curl && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p /app/auth /app/data && chown -R node:node /app
USER node

# auth = sesión de WhatsApp, data = base de datos SQLite
VOLUME ["/app/auth", "/app/data"]

CMD ["node", "--disable-warning=ExperimentalWarning", "dist/index.js"]
