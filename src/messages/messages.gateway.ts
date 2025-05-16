import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SendMessageDto } from '../common/dto/send-message.dto';
import { HandleConnectionHandler } from './handlers/handle-connection.handler';
import { SendMessageHandler } from './handlers/send-message.handler';
import { MessagesService } from './messages.service';


@WebSocketGateway(3001, {
  cors: {
    origin: '*', // или конкретные
    methods: '*',
    credentials: true,
  },
})

export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly connectionHandler: HandleConnectionHandler,
    private readonly messagesService: MessagesService
  ) {}

  async handleConnection(client: Socket) {
    await this.connectionHandler.handle(client);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectionHandler.removeClient(userId);
      console.log(`Disconnected ${userId}`);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string },) {
    const { roomId } = data;
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.leave(room);
      }
    });
    client.join('group_' + roomId);
    console.log(`Client ${client.id} joined room ${roomId}`);
  }

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

    console.log({
      text: message.text,
      createdAt: message.createdAt,
      username: message.sender.username,
      groupId: data.groupId
    })

    client.to('group_' + data.groupId.toString()).emit('new_message', {
      text: message.text,
      createdAt: message.createdAt,
      username: message.sender.username,
      groupId: data.groupId
    });

    return message;
  }

  
}
