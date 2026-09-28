FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
# Local SQLite lives in /app/data. Mount a volume there, or set DATABASE_URL to a hosted libSQL/Turso database.
VOLUME /app/data
EXPOSE 3000
CMD ["node", "server/index.js"]
