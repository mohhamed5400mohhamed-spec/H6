# Production multi-stage Dockerfile for HassanPro Chat
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install


# Copy all source files
COPY . .

# Build Vite frontend
RUN npm run build

# Expose server port (default 3000)
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start full-stack server
CMD ["npm", "start"]
