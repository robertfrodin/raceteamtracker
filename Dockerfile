FROM node:latest

RUN mkdir /root/app
WORKDIR /root/app
COPY ./raceteamtracker /root/app

RUN npm install -g serve

EXPOSE 3000

CMD serve -s build