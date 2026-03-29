FROM node:18-alpine
WORKDIR /app
COPY artifacts/api-server/package*.json ./artifacts/api-server/
COPY lib/ ./lib/
WORKDIR /app/artifacts/api-server
RUN npm install --legacy-peer-deps
COPY artifacts/api-server/ /app/artifacts/api-server/
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.mjs"]
