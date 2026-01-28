FROM node:lts-slim AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Production stage
FROM node:lts-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package files
COPY --from=builder /usr/src/app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application code
COPY --from=builder /usr/src/app/src ./src

# Create directories for database and uploads
RUN mkdir -p /usr/src/app/data /usr/src/app/uploads

# Expose port (default 3001, can be overridden with PORT env var)
EXPOSE 3001

# Start server (database schema is initialized automatically on first run)
CMD ["npm", "start"]
