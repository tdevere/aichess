FROM node:20-alpine

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy shared package first
COPY shared/package*.json ./shared/
WORKDIR /app/shared
RUN npm ci
COPY shared/ ./
RUN npm run build

# Build backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm rebuild bcrypt --build-from-source
RUN npm run build

WORKDIR /app/backend
EXPOSE 5000
CMD ["node", "dist/backend/src/server.js"]
