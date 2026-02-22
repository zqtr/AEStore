# AE Store - Node.js app for Render
FROM node:20-alpine

WORKDIR /app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy app source
COPY . .

# Render sets PORT; app uses it. Listen on 0.0.0.0 so the host can reach the container.
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
