FROM node:20-alpine AS builder
WORKDIR /app

ARG NPM_STRICT_SSL=true

COPY package*.json ./
ENV NODE_ENV=development
RUN if [ "$NPM_STRICT_SSL" = "false" ]; then npm config set strict-ssl false; fi \
  && npm install --include=dev

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
ARG APP_ENV=production

WORKDIR /app
ENV NODE_ENV=${APP_ENV}

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 4099

CMD ["node", "dist/main.js"]
