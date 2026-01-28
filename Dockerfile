FROM node:lts-slim AS builder

WORKDIR /usr/src/app

# Install dependencies in a way that's compatible with the lockfile across npm versions
COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:lts-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/next.config.* ./

# Install only production dependencies in the runtime image
RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "start"]