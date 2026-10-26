FROM node:20-slim

# Install Chromium and fonts for PDF generation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies including devDependencies (needed for build tools like Vite & TypeScript)
RUN npm --prefix server install --include=dev
RUN npm --prefix client install --include=dev

# Copy application source code
COPY . .

# Build client production bundle
RUN cd client && npm run build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server/src/index.js"]
