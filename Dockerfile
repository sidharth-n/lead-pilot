FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment
ENV DATABASE_PATH=/app/data/cadence.db
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the app
CMD ["npx", "tsx", "src/index.ts"]
