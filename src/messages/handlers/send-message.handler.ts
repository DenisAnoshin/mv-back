import { Injectable } from '@nestjs/common';
import { SendMessageDto } from '../../common/dto/send-message.dto';
import { MessagesService } from '../messages.service';
import { Socket } from 'socket.io';

@Injectable()
export class SendMessageHandler {
  constructor(private readonly messagesService: MessagesService) {}

  async handle(
    data: SendMessageDto,
    client: Socket,
  ) {
    const senderId = client.data.userId;

    const message = await this.messagesService.sendMessage({
      groupId: data.groupId,
      senderId,
      text: data.text,
    });

console.log(message.sender.username)

    client.to(`group_${data.groupId}`).emit('group_message', {
      text: message.text,
      createdAt: message.createdAt,
      username: message.sender.username,
      groupId: data.groupId
    });

    return message;
  }
}
