import { Module } from '@nestjs/common';
import { UsersGroupsService } from './users_groups.service';
import { UsersGroupsController } from './users_groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersGroups } from './users_groups.entity';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UsersGroups, User, Group])],
  controllers: [UsersGroupsController],
  providers: [UsersGroupsService],
  exports: [UsersGroupsService],
})
export class UsersGroupsModule {}
