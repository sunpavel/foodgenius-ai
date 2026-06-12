# ── Stage 1: build Mini App (React/Vite) ─────────────────────
FROM node:20-alpine AS webapp
WORKDIR /webapp
COPY webapp/package*.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

# ── Stage 2: build bot (TypeScript) ──────────────────────────
FROM node:20-alpine AS bot
WORKDIR /bot
COPY bot/package*.json ./
RUN npm ci
COPY bot/ ./
RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY bot/package*.json ./
RUN npm ci --omit=dev

COPY --from=bot /bot/dist ./dist
COPY --from=webapp /webapp/dist ./public

# user_data — профили пользователей (подключите Railway Volume на /app/user_data)
RUN mkdir -p /app/user_data

EXPOSE 3000
CMD ["node", "dist/bot.js"]
