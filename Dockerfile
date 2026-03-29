FROM node:18-alpine
WORKDIR /app
# Copy ALL source code first (needed for file: protocol packages)
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
# Install dependencies for local packages first
WORKDIR /app/lib/db
RUN npm install --legacy-peer-deps
WORKDIR /app/lib/api-zod
RUN npm install --legacy-peer-deps
# Install api-server dependencies (file: packages will resolve correctly now)
WORKDIR /app/artifacts/api-server
RUN npm install --legacy-peer-deps
# Build the api-server
RUN npm run build
EXPOSE 3000
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
