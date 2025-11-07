# Use Node.js LTS version for security and stability
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Install serve globally
RUN npm install -g serve

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variable
ENV NODE_ENV=production

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]