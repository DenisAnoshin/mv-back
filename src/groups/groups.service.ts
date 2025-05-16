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

  async create(dto: CreateGroupDto, adminId: number) {
    const admin = { id: adminId } as User;
    const userIds = [...new Set([...dto.userIds, adminId])];

    console.log(userIds)

    const group = this.groupsRepo.create({
      name: dto.name,
      admin,
    });
  
    const savedGroup = await this.groupsRepo.save(group);
  
    const usersGroups = userIds.map((userId) =>
      this.usersGroupsRepo.create({
        group: savedGroup,
        user: { id: userId } as User,
      }),
    );
  
    await this.usersGroupsRepo.save(usersGroups);

    for (const userId of userIds) {
      const client = this.connectionHandler.getClient(userId);
      console.log(userId)

      if (client) {
        client.join(`group_${savedGroup.id}`);
        client.emit('new_group');
        console.log(`Join ${savedGroup.id}`)
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
        where: { group: { id: group.id }, ai: false },
        order: { createdAt: 'DESC' },
        relations: ['sender'],
      });
  
      return {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        sortDate: lastMessage?.createdAt ?? group.createdAt, // 👈 ключ для сортировки
        messages: lastMessage ? {
          text: lastMessage.text,
          username: lastMessage.sender.username,
          createdAt: lastMessage.createdAt,
        } : null,
      };
    }));
  
    // Сортировка: последние вверху
    groups.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  
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
  
  async getGroupInfo(groupId: number, userId: number): Promise<any> {
    // 1. Найти группу с админом
    const group = await this.groupsRepo.findOne({
      where: { id: groupId },
      relations: ['admin'],
    });
  
    if (!group) {
      throw new NotFoundException('Group not found');
    }
  
    // 2. Найти всех участников группы через UsersGroups
    const userGroups = await this.usersGroupsRepo.find({
      where: { group: { id: groupId } },
      relations: ['user'],
    });
  
    // 3. Отфильтровать текущего пользователя
    const otherUsers = userGroups
      .filter(ug => ug.user.id !== userId)
      .map(ug => ({
        id: ug.user.id,
        username: ug.user.username,
      }));
  
    // 4. Проверить, является ли текущий пользователь админом
    const isAdmin = group.admin.id === userId;
  
    // 5. Вернуть структуру
    return {
      groupId: group.id,
      name: group.name,
      isAdmin,
      users: otherUsers,
    };
  }

  async leaveGroup(groupId: number, userId: number): Promise<{ deletedGroup: boolean }> {
    const group = await this.groupsRepo.findOne({
      where: { id: groupId },
      relations: ['admin'],
    });
   
    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }
  
    const userGroup = await this.usersGroupsRepo.findOne({
      where: {
        group: { id: groupId },
        user: { id: userId },
      },
      relations: ['user', 'group'],
    });
  
    if (!userGroup) {
      throw new NotFoundException('Пользователь не состоит в группе');
    }
  
    const isAdmin = group.admin.id === userId;
  
    if (isAdmin) {
      // Удалить все сообщения в группе
      await this.messagesRepo.delete({ group: { id: groupId } });
  
      // Удалить все связи UsersGroups
      await this.usersGroupsRepo.delete({ group: { id: groupId } });
  
      // Удалить саму группу
      await this.groupsRepo.delete({ id: groupId });
  
      return { deletedGroup: true };
    } else {
      // Просто удалить пользователя из группы
      await this.usersGroupsRepo.delete({ id: userGroup.id });
  
      return { deletedGroup: false };
    }
  }
  
  
  


}
