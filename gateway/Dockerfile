FROM node:24.14.0-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY .env.example ./
COPY *.js ./

EXPOSE 8000

CMD ["node", "index.js"]
