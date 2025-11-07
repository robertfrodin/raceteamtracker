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

# Create nginx config template that uses PORT environment variable
RUN echo 'server {\
    listen ${PORT};\
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
}' > /etc/nginx/conf.d/default.conf.template

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Create startup script that substitutes PORT and starts nginx
RUN echo '#!/bin/sh\necho "Starting nginx on port ${PORT:-3000}"\nenvsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf\ncat /etc/nginx/conf.d/default.conf\nnginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Set default port (Back4App will override this)
ENV PORT=3000

# Expose the port
EXPOSE $PORT

# Start with our custom script
CMD ["/start.sh"]