FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY start.sh ./start.sh

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

RUN chmod +x /app/start.sh

EXPOSE 3000
CMD ["/app/start.sh"]
