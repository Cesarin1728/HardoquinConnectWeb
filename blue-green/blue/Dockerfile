FROM node:22-alpine AS deps

WORKDIR /app

COPY hardoquin_server/package*.json ./hardoquin_server/
COPY hardoquin_server/prisma/        ./hardoquin_server/prisma/

RUN cd hardoquin_server && npm ci --omit=dev
RUN cd hardoquin_server && npx prisma generate

FROM node:22-alpine

LABEL version="1.0.0" environment="blue"

WORKDIR /app

COPY --from=deps /app/hardoquin_server/node_modules ./hardoquin_server/node_modules
COPY hardoquin_server/ ./hardoquin_server/
COPY Frontend/         ./Frontend/

WORKDIR /app/hardoquin_server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
