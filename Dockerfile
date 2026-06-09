FROM node:20.20.2-bookworm

RUN apt-get update && apt-get install -y \
    libreoffice default-jre fonts-liberation fonts-dejavu tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# Fix obrigatório para o libreoffice-convert no Docker
ENV HOME=/tmp

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]