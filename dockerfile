# Bun.sh Dockerfile
FROM oven/bun:latest
LABEL author="Lillious Networks"
LABEL version="1.0"
LABEL description="Frostfire Forge Dockerfile"
WORKDIR /usr/src/app
COPY package*.json ./

COPY . .
EXPOSE 80
EXPOSE 3000
EXPOSE 443

CMD ["sh", "-c", "bun install && bun production"]