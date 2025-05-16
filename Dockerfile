# Используем официальный образ Node.js на базе Alpine для продакшн
FROM node:20-alpine

# Устанавливаем Nest CLI (для компиляции, если необходимо)
RUN npm install -g @nestjs/cli

WORKDIR /app

# Копируем только package.json и lock-файл, чтобы использовать кэш Docker для ускорения сборки
COPY package*.json ./

# Устанавливаем только продакшн-зависимости
RUN npm install 

# Копируем только необходимые файлы
COPY . .

# Скомпилируем проект для продакшн (если используется TypeScript)
RUN npm run build

# Открываем порт 3000
EXPOSE 3000

# Запускаем приложение в продакшн-режиме
CMD ["npm", "run", "start:prod"]
