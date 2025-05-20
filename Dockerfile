FROM node:23
WORKDIR /app

RUN npm install -g concurrently

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

WORKDIR /app
COPY backend ./backend
WORKDIR /app/backend
RUN npm install

WORKDIR /app

EXPOSE 3001

CMD concurrently "cd backend && node server.js"