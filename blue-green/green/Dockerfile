FROM node:22-alpine AS deps

WORKDIR /app

COPY hardoquin_server/package*.json ./hardoquin_server/
COPY hardoquin_server/prisma/        ./hardoquin_server/prisma/

RUN cd hardoquin_server && npm ci --omit=dev
RUN cd hardoquin_server && npm install ws --no-save
RUN cd hardoquin_server && npx prisma generate

FROM node:22-alpine

LABEL version="2.0.0" environment="green"

WORKDIR /app

COPY --from=deps /app/hardoquin_server/node_modules ./hardoquin_server/node_modules
COPY hardoquin_server/ ./hardoquin_server/
COPY Frontend/         ./Frontend/

COPY blue-green/green/frontend-v2/ ./Frontend/

COPY blue-green/green/server-v2/server.js    ./hardoquin_server/server.js
COPY blue-green/green/server-v2/index.html   ./hardoquin_server/index.html

WORKDIR /app/hardoquin_server

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "server.js"]
