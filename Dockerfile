FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=optional

COPY . .
RUN npm run build

EXPOSE 4444 4445

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1:4444/health || exit 1

ENTRYPOINT ["node", "dist/cli/main.js"]
CMD ["doctor"]
