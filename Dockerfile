FROM node:20-slim

# Install Chromium and fonts for PDF generation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm --prefix server install --production=false
RUN npm --prefix client install

# Copy application source code
COPY . .

# Build client production bundle
RUN npm --prefix client run build

EXPOSE 5000

CMD ["node", "server/src/index.js"]
