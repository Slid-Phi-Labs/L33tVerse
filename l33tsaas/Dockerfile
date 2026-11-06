# L33tSaaS supermarket core — Node service for Fly
FROM node:22-slim
WORKDIR /app

COPY package.json ./
COPY lib/ ./lib/
COPY tests/ ./tests/

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "lib/server.js"]
