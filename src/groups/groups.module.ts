import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './groups.entity';
import { UsersGroups } from '../users_groups/users_groups.entity';
import { User } from '../users/users.entity';
import { Message } from 'src/messages/messages.entity';
import { OpenrouterModule } from 'src/openrouter/openrouter.module';
import { MessagesModule } from 'src/messages/messages.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, UsersGroups, User, Message]),
    WebsocketModule,
    MessagesModule,
    OpenrouterModule
],
  controllers: [GroupsController],
  providers: [
    GroupsService,
  ],
  exports: [GroupsService],
})
export class GroupsModule {}
