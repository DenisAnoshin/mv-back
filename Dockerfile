# Dockerfile.dev
FROM node:20-alpine

# Устанавливаем Nest CLI (для dev-среды)
RUN npm install -g @nestjs/cli

WORKDIR /app

# Только package.json и lock-файл сначала
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь исходный код
COPY . .

# Открываем порт
EXPOSE 3000

# Запускаем в режиме разработки
CMD ["npm", "run", "start:dev"]
