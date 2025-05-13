import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './messages.entity';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { JwtModule } from '@nestjs/jwt';
import { HandleConnectionHandler } from './handlers/handle-connection.handler';
import { SendMessageHandler } from './handlers/send-message.handler';
import { UsersGroups } from 'src/users_groups/users_groups.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Group, UsersGroups]),
    JwtModule.register({ secret: 'your_secret_key' }),
  ],
  providers: [
    MessagesGateway,
    MessagesService,
    HandleConnectionHandler,
    SendMessageHandler,
    
  ],
})
export class MessagesModule {}
