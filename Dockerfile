# Use Node base image
FROM node:23

# Set working dir
WORKDIR /app

# Copy backend
COPY backend ./backend

# Copy frontend build (dist folder only)
COPY frontend/dist ./frontend/dist

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
