FROM node:23
WORKDIR /app

RUN npm install -g concurrently

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install

WORKDIR /app
COPY backend ./backend
WORKDIR /app/backend
RUN npm install

WORKDIR /app

EXPOSE 5173 3001

CMD concurrently "cd backend && node server.js" "cd frontend && npm run host"