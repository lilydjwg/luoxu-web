FROM node:20-alpine

WORKDIR /app

ENV VITE_LUOXU_URL="http://127.0.0.1:9008"

COPY package*.json ./

RUN npm install

COPY . .

# RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "serve"]
