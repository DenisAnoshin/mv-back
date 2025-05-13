import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './groups.entity';
import { UsersGroups } from '../users_groups/users_groups.entity';
import { User } from '../users/users.entity';
import { Message } from 'src/messages/messages.entity';
import { HandleConnectionHandler } from 'src/messages/handlers/handle-connection.handler';
import { MessagesService } from 'src/messages/messages.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, UsersGroups, User, Message]),
    JwtModule.register({
      secret: 'supersecretjwt', // Укажи свой секрет
      signOptions: { expiresIn: '60s' }, // Пример параметров для JWT
    }),
],
  controllers: [GroupsController],
  providers: [GroupsService, HandleConnectionHandler, MessagesService],
  exports: [GroupsService],
})
export class GroupsModule {}
