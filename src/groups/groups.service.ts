import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './groups.entity';
import { Repository } from 'typeorm';
import { CreateGroupDto } from '../common/dto/create-group.dto';
import { UsersGroups } from '../users_groups/users_groups.entity';
import { User } from '../users/users.entity';
import { Message } from 'src/messages/messages.entity';
import { MessagesGateway } from 'src/messages/messages.gateway';
import { HandleConnectionHandler } from 'src/messages/handlers/handle-connection.handler';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepo: Repository<Group>,
    @InjectRepository(UsersGroups)
    private usersGroupsRepo: Repository<UsersGroups>,
    @InjectRepository(Message)
    private messagesRepo: Repository<Message>,
    private readonly connectionHandler: HandleConnectionHandler,
  ) {}

  async create(dto: CreateGroupDto, adminId: number): Promise<Group> {
    const admin = { id: adminId } as User;
    const group = this.groupsRepo.create({
      name: dto.name,
      admin,
    });
  
    const savedGroup = await this.groupsRepo.save(group);
  
    const allUserIds = Array.from(new Set([adminId, ...dto.userIds]));
  
    const userIds = [...new Set([...dto.userIds, adminId])];

    const usersGroups = allUserIds.map((userId) =>
      this.usersGroupsRepo.create({
        group: savedGroup,
        user: { id: userId } as User,
      }),
    );
  
    await this.usersGroupsRepo.save(usersGroups);

    for (const userId of userIds) {
      const socket = this.connectionHandler.getClient(userId);
      if (socket) {
        socket.join(`group_${savedGroup.id}`);
      }
    }
  
    return savedGroup;
  }
  

  async findAll(): Promise<Group[]> {
    return this.groupsRepo.find();
  }

  async findUsersInGroup(groupId: number): Promise<User[]> {
    const group = await this.groupsRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const usersGroups = await this.usersGroupsRepo.find({
      where: { group: { id: groupId } },
      relations: ['user'],
    });

    return usersGroups.map((ug) => ug.user);
  }

  async remove(id: number): Promise<void> {
    await this.groupsRepo.delete(id);
  }

  async findGroupsForUser(userId: number): Promise<any[]> {
    const userGroups = await this.usersGroupsRepo.find({
      where: { user: { id: userId } },
      relations: ['group'],
    });
  
    const groups = await Promise.all(userGroups.map(async (ug) => {
      const group = ug.group;
  
      // Получение последнего сообщения в группе
      const lastMessage = await this.messagesRepo.findOne({
        where: { group: { id: group.id } },
        order: { createdAt: 'DESC' },
        relations: ['sender']
      });
  
      // Формируем результат
      return {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        messages: lastMessage ? {
          text: lastMessage.text,
          username: lastMessage.sender.username,
          createdAt: lastMessage.createdAt,
        } : null, 
      };
    }));
  
    return groups;
  }
  async getLastMessagesInGroup(groupId: number, userId: number): Promise<any[]> {
    const group = await this.groupsRepo.findOne({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const messages = await this.messagesRepo.find({
      where: { group: { id: groupId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: 100,
    });

    // Изменяем объект sender без изменения оригинала
    return messages.map((message) => {
      const { password, ...senderWithoutPassword } = message.sender || {};
      return {
        id: message.id,
        text: message.text,
        sender: senderWithoutPassword,
        createdAt: message.createdAt,
        me: message.sender?.id === userId,
      };
    });
  }
  


}
