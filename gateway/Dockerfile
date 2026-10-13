FROM node:24.14.0-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . ./

USER node

EXPOSE 8000

CMD ["node", "index.js"]
