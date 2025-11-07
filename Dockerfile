# Build stage
FROM node:22
# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Create a startup script with debugging
RUN echo '#!/bin/sh\n\
echo "=== Container Startup Debug ===" \n\
echo "PORT environment variable: ${PORT:-not set}" \n\
echo "Default port: 3000" \n\
echo "Files in dist directory:" \n\
ls -la /app/dist/ \n\
echo "Starting serve on port 3000..." \n\
echo "Server will be accessible at: http://localhost:3000" \n\
serve -s dist -l 3000 --no-clipboard --single' > /start.sh && chmod +x /start.sh

# Expose port
EXPOSE 3000

# Start the application with our debug script
CMD ["/start.sh"]