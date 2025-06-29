import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { UsersGroupsModule } from './users_groups/users_groups.module';
import { MessagesModule } from './messages/messages.module';

import { User } from './users/users.entity';
import { Group } from './groups/groups.entity';
import { UsersGroups } from './users_groups/users_groups.entity';
import { Message } from './messages/messages.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WebsocketModule } from './websocket/websocket.module';
import { OpenAIModule } from './openai/openai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Group, UsersGroups, Message],
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    GroupsModule,
    UsersGroupsModule,
    MessagesModule,
    WebsocketModule,
    OpenAIModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
