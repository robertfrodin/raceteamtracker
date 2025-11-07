# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --silent

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Debug: Verify files were copied correctly
RUN echo "Contents of /app:" && ls -la /app/
RUN echo "Contents of /app/dist:" && ls -la /app/dist/

# Default port (Back4app will override with PORT env var)
ENV PORT=3000

# Expose port
EXPOSE $PORT

# Create a startup script that provides better debugging
RUN echo '#!/bin/sh\necho "Starting server on port $PORT"\necho "Files in dist directory:"\nls -la /app/dist/\necho "Starting serve..."\nserve -s /app/dist -l $PORT --single --no-clipboard --verbose' > /start.sh
RUN chmod +x /start.sh

# Start the application
CMD ["/start.sh"]