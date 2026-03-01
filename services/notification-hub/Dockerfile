# Alpine Linux keeps the image tiny (~40MB vs 900MB for full Node image)
FROM node:20-alpine
WORKDIR /app
# Copy package files FIRST — Docker caches this layer for faster rebuilds
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3005
# npm start runs seed.js first, then server.js
CMD ["npm", "start"]