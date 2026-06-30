FROM node:20-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar con npm (compatible con Dokploy)
RUN npm install --omit=dev && npm cache clean --force

# Copiar el resto del código
COPY server.js ./
COPY public ./public

# No correr como root
USER node

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
