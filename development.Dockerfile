FROM node:24.15.0-alpine3.23

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
RUN apk add --no-cache bash ruby ruby-rdoc shellcheck \
    && apk add --no-cache --virtual .lint-build ruby-dev build-base \
    && gem install rubocop --version 1.92.2 --no-document \
    && apk del .lint-build

COPY . .

CMD ["npm", "run", "example:dev"]
