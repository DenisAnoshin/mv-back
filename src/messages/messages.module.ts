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
import { HttpModule, HttpService } from '@nestjs/axios';
import { MessagesController } from './messages.controller';
import { OpenrouterModule } from 'src/openrouter/openrouter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Group, UsersGroups]),
    JwtModule.register({ secret: 'your_secret_key' }),
    HttpModule,
    OpenrouterModule
  ],
  controllers: [MessagesController],
  providers: [
    MessagesGateway,
    MessagesService,
    HandleConnectionHandler,
    SendMessageHandler,
   // OpenrouterService
  ],
  exports:[HandleConnectionHandler, MessagesService]
})
export class MessagesModule {}
