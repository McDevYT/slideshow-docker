# Base stage (Common for both)
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Development stage (Local only)
FROM base AS development
# We don't copy source here because we will bind-mount it in compose
CMD ["npm", "run", "start:dev"]

# Build stage (Production only)
FROM base AS builder
COPY . .
RUN npm run build

# Production stage (Final image)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
