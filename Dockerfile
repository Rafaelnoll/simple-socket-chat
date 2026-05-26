FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server/ ./server/

EXPOSE 3000

CMD ["node", "server/index.js"]