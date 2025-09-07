# Simple Dockerfile for Node/Express app serving static frontend
FROM node:18-alpine

WORKDIR /app
COPY server/package.json server/package-lock.json* server/ /app/server/
COPY client/ /app/client/

WORKDIR /app/server
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
