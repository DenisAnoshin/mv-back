import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './messages.entity';
import { MessagesService } from './messages.service';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { UsersGroups } from 'src/users_groups/users_groups.entity';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MessagesController } from './messages.controller';
import { OpenrouterModule } from 'src/openrouter/openrouter.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Group, UsersGroups]),
    HttpModule,
    OpenrouterModule,
    forwardRef(() => WebsocketModule)
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
  ],
  exports: [MessagesService]
})
export class MessagesModule {}
