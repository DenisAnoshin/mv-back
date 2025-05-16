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
import { HttpModule } from '@nestjs/axios';
import { OpenrouterModule } from 'src/openrouter/openrouter.module';
import { MessagesModule } from 'src/messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, UsersGroups, User, Message]),
    JwtModule.register({
      secret: 'supersecretjwt', // Укажи свой секрет
      signOptions: { expiresIn: '60s' }, // Пример параметров для JWT
    }),
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
