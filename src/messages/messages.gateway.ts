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
    private readonly sendMessageHandler: SendMessageHandler,
  ) {}

  async handleConnection(client: Socket) {
    await this.connectionHandler.handle(client);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectionHandler.removeClient(userId);
      console.log(`Client ${userId} disconnected`);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    return this.sendMessageHandler.handle(data, client);
  }
}
