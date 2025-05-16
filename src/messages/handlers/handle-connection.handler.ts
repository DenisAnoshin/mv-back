import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { MessagesService } from '../messages.service';

@Injectable()
export class HandleConnectionHandler {
  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,

  ) {}

  private clients: Map<number, Socket> = new Map();

  async handle(client: Socket): Promise<number | null> {
    try {
      const token = client.handshake.query.Authorization?.toString().split(' ')[1];
      const payload = this.jwtService.verify(token, { secret: 'supersecretjwt' });
      client.data.userId = payload.sub;
      this.clients.set(payload.sub, client);

      const userGroups = await this.messagesService.getUserGroups(payload.sub);

      userGroups.forEach(groupId => {
       client.join(`group_${groupId.id}`);
       console.log(`Client ${payload.sub} joined ${groupId.id}`);
      });

      console.log(`Connected ${client.data.userId}`)


    } catch (e) {
      client.emit('error', 'Invalid token');
      client.disconnect();
      return null;
    }
  }

  getClient(userId: number): Socket | undefined {
    return this.clients.get(userId);
  }
  
  getClients(): Map<number, Socket> {
    return this.clients;
  }

  removeClient(userId: number) {
    this.clients.delete(userId);
  }
}
