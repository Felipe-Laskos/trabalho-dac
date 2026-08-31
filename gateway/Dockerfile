FROM node:24.14.0-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY .env.example ./
COPY index.js redis.js rabbit.js topologia.js auth.js login.js ./

EXPOSE 8000

CMD ["node", "index.js"]
