# Imagem base enxuta do Node.js (Debian slim).
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# Instala dependências como root (precisa escrever em /app).
COPY package.json ./
RUN npm install --omit=dev

# Copia o código e transfere a propriedade dos arquivos para o usuário não-root.
COPY . .
RUN chown -R node:node /app

# Passa a executar como usuário não-root "node" (uid 1000), já presente na imagem.
USER node

EXPOSE 3000

# Forma exec: o processo "node" vira o PID 1 do container.
CMD ["node", "server.js"]
