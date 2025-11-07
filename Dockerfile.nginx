# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create nginx config for SPA that listens on port 3000
RUN echo 'server {\
    listen 3000;\
    server_name localhost;\
    root /usr/share/nginx/html;\
    index index.html;\
\
    location / {\
        try_files $uri $uri/ /index.html;\
    }\
\
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {\
        expires 1y;\
        add_header Cache-Control "public, immutable";\
    }\
}' > /etc/nginx/conf.d/default.conf

# Verify files and config
RUN echo "=== Nginx config ===" && cat /etc/nginx/conf.d/default.conf
RUN echo "=== HTML files ===" && ls -la /usr/share/nginx/html/

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]