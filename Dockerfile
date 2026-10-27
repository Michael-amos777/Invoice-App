FROM node:20-slim

# Install Chromium, fonts, all required shared libraries, and build tools for sqlite3 compilation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install client dependencies (including devDependencies for build tools)
RUN npm --prefix client install --include=dev

# Install server dependencies and rebuild sqlite3 from source against container's local GLIBC
RUN cd server && npm install --include=dev && npm rebuild sqlite3 --build-from-source

# Copy application source code
COPY . .

# Ensure server uploads directory exists
RUN mkdir -p server/uploads

# Build client production bundle
RUN cd client && npm run build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server/src/index.js"]
