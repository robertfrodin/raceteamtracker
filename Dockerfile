FROM node:latest

RUN mkdir /root/app
WORKDIR /root/app
COPY . /root/app

RUN npm run build

RUN npm install -g serve

EXPOSE 3000

ENV NODE_ENV=production

CMD ["serve", "-s", "dist", "-l", "3000"]