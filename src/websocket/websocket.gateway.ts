import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from 'src/messages/messages.service';
import { SendMessageDto } from 'src/common/dto/send-message.dto';
import { DeleteMessageDto } from 'src/common/dto/delete-message.dto';
import { AuthService } from 'src/auth/auth.service';
import { WebsocketService } from './websocket.service';

@WebSocketGateway(3001, {
  allowEIO3: true,
  cors: {
    origin: '*',
    methods: '*',
    credentials: true,
  },
})

export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public server: Server;

  // Храним клиентов
  private clients: Map<number, Socket> = new Map();

  constructor(
    private readonly authService: AuthService,
    private readonly messagesService: MessagesService,
    private readonly websocketService: WebsocketService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.Authorization?.toString().split(' ')[1];
      const payload = await this.authService.validateToken(token);
      client.data.userId = payload.sub;
      this.clients.set(payload.sub, client);

      const userGroups = await this.messagesService.getUserGroups(payload.sub);
      userGroups.forEach(group => {
        client.join(`group_${group.id}`);
      });

      console.log(`Connected ${client.data.userId}`);
      return payload.sub;
    } catch (e) {
      client.emit('error', 'Invalid token');
      client.disconnect();
      return null;
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.clients.delete(userId);
      console.log(`Disconnected ${userId}`);
    }
  }

  afterInit() {
    // Прокидываем сервер в сервис
    this.websocketService.setServer(this.server);
    // Также можно прокинуть getClient если нужно:
    this.websocketService.setClientGetter((userId: number) => this.getClient(userId));
  }

  // Получить клиента по id (используется в сервисе)
  getClient(userId: number): Socket | undefined {
    return this.clients.get(userId);
  }

  // Основная логика сообщений
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    const message = await this.messagesService.sendMessage({
      groupId: data.groupId,
      senderId,
      text: data.text,
    });

    // Отправка в группу через сервис
    client.to(`group_${data.groupId}`).emit('new_message', {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      username: message.sender.username,
      groupId: data.groupId,
    });

    return message;
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: DeleteMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const deleted = await this.messagesService.deleteMessageById(data.messageId, userId);

    if (!deleted) {
      return { success: false, error: 'Forbidden or message not found' };
    }

    // Отправка в группу через сервис
    this.websocketService.emitToRoom(`group_${data.groupId}`, 'delete_message', {
      messageId: data.messageId,
      groupId: data.groupId,
    });

    return { success: true, messageId: data.messageId };
  }
}
