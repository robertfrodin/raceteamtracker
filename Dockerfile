FROM node:latest

RUN mkdir /root/app
WORKDIR /root/app
COPY package.json /root/app

RUN npm install

RUN npm i -g serve

COPY . /root/app

RUN npm run build

EXPOSE 3000

CMD [ "serve", "-s", "dist" ]