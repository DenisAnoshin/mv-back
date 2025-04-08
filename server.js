import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from './src/routes/authRoutes.js';
import groupRoutes from './src/routes/groutpRoutes.js';
import messageRoutes from './src/routes/messageRoute.js';
import * as messageService from './src/services/messageService.js';
import { verifyTokenSocket } from './src/middleware/authMiddleware.js';

import { createServer } from 'http';
import { Server } from 'socket.io'; 

import cors from 'cors'
import db from './src/models/index.js';

const app = express();
const port = 8080;
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};


app.use(cors(corsOptions));

// Обработка preflight запросов
app.options('*', cors(corsOptions));


// Создаем HTTP сервер
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*" // Настрой CORS для продакшена
  }
});

io.use(verifyTokenSocket)


// Подключение WebSocket
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.user.id);
  
  
  socket.on('send_message', async (data) => {
    try {
      console.log('Новое сообщение:', data);

      await messageService.createMessage(data.group_id, socket.user.id, data.message);

      const currentDate = new Date();

      socket.broadcast.emit('new_message', {
        message: data.message,
        username: socket.user.username,
        created_at:currentDate.toString(),
        group_id: data.group_id
      });
      console.log('Сообщение отправлено:', data);
    } catch (error) {
      console.error('Ошибка отправки:', error);
    }
  });
});


app.use(bodyParser.json());

db.sequelize.sync({sync: true});

app.use('/auth', authRoutes);
app.use('/group', groupRoutes);
app.use('/message', messageRoutes);

// app.listen(port, () => {
//     console.log(`Server is running`);
// });

httpServer.listen(port, () => { 
    console.log(`Server is running`);
});