FROM node:22.13.0-alpine3.21

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN apk add --no-cache ruby ruby-rdoc shellcheck \
    && apk add --no-cache --virtual .lint-build ruby-dev build-base \
    && gem install rubocop --version 1.92.2 --no-document \
    && apk del .lint-build

COPY ./src ./src

CMD ["npm run start"]
