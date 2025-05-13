# Используем официальный Node.js образ
FROM node:20-alpine

# Устанавливаем глобально NestJS CLI (опционально)
RUN npm install -g @nestjs/cli

# Рабочая директория для приложения
WORKDIR /app

# Копируем файлы проекта в контейнер
COPY . .

# Устанавливаем все зависимости, включая TypeORM
RUN npm install

# Собираем приложение
RUN npm run build

# Открываем порт, на котором будет работать сервер
EXPOSE 3000

# Команда для запуска Nest.js приложения
CMD ["npm", "run", "start:prod"]
