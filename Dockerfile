# Maky Beauty Bar — one process serves the built SPA and the API.
# tsx and cross-env (the start script) live in devDependencies, so devDeps
# are kept installed rather than pruned.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite build -> dist/, which server/app.ts serves in production.
RUN npm run build

EXPOSE 3001

# `npm start` = cross-env NODE_ENV=production tsx server/index.ts
# db.ts creates the schema (CREATE TABLE IF NOT EXISTS) on boot.
CMD ["npm", "start"]
