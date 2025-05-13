import {
    Injectable,
    NotFoundException,
    ConflictException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { UsersGroups } from './users_groups.entity';
  import { AddUserToGroupDto } from '../common/dto/add-user-to-group.dto';
  import { User } from '../users/users.entity';
  import { Group } from '../groups/groups.entity';
  
  @Injectable()
  export class UsersGroupsService {
    constructor(
      @InjectRepository(UsersGroups)
      private readonly usersGroupsRepo: Repository<UsersGroups>,
  
      @InjectRepository(User)
      private readonly userRepo: Repository<User>,
  
      @InjectRepository(Group)
      private readonly groupRepo: Repository<Group>,
    ) {}
  
    async addUserToGroup(dto: AddUserToGroupDto): Promise<UsersGroups> {
      const user = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('User not found');
  
      const group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
      if (!group) throw new NotFoundException('Group not found');
  
      const exists = await this.usersGroupsRepo.findOne({
        where: {
          user: { id: dto.userId },
          group: { id: dto.groupId },
        },
      });
  
      if (exists) {
        throw new ConflictException('User already in this group');
      }
  
      const usersGroup = this.usersGroupsRepo.create({ user, group });
      return this.usersGroupsRepo.save(usersGroup);
    }
  
    async removeUserFromGroup(dto: AddUserToGroupDto): Promise<void> {
      const relation = await this.usersGroupsRepo.findOne({
        where: {
          user: { id: dto.userId },
          group: { id: dto.groupId },
        },
      });
  
      if (!relation) throw new NotFoundException('Relation not found');
  
      await this.usersGroupsRepo.remove(relation);
    }
  }
  