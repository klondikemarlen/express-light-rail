FROM node:24.15.0-alpine3.23

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
RUN apk add --no-cache bash

COPY . .

CMD ["npm", "run", "example:dev"]
