FROM node:22.13.0-alpine3.21

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY ./src ./src

CMD ["npm run start"]
