FROM node:18-alpine
WORKDIR /app
# Copy package files for dependency installation
COPY lib/db/package*.json ./lib/db/
COPY lib/api-zod/package*.json ./lib/api-zod/
COPY artifacts/api-server/package*.json ./artifacts/api-server/
# Install dependencies for local packages first
WORKDIR /app/lib/db
RUN npm install --legacy-peer-deps
WORKDIR /app/lib/api-zod
RUN npm install --legacy-peer-deps
# Install api-server dependencies
WORKDIR /app/artifacts/api-server
RUN npm install --legacy-peer-deps
# Copy all source code
WORKDIR /app
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
# Build the api-server
WORKDIR /app/artifacts/api-server
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.mjs"]
