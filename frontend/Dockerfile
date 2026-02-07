FROM node:20-alpine as build

WORKDIR /app

# Copy shared package first
COPY shared/package*.json ./shared/
WORKDIR /app/shared
RUN npm ci
COPY shared/ ./
RUN npm run build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
