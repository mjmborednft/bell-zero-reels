FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip python3-numpy ca-certificates fonts-liberation \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
    libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
 && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages edge-tts
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx remotion browser ensure
COPY . .
ENV ELEVENLABS_API_KEY="" ELEVENLABS_VOICE_ID=""
CMD ["bash", "scripts/run_episode.sh", "1"]
