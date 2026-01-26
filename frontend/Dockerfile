# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Development stage (Local only)
FROM base AS development
# Expose Vite host to allow outside access
CMD ["npm", "run", "dev", "--", "--host"]

# Build stage
FROM base AS builder
COPY . .
# This ARG is crucial for baking the API URL into the React build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage (Nginx)
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
