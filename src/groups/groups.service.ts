import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './groups.entity';
import { Repository } from 'typeorm';
import { CreateGroupDto } from '../common/dto/create-group.dto';
import { UsersGroups } from '../users_groups/users_groups.entity';
import { User } from '../users/users.entity';
import { Message } from 'src/messages/messages.entity';
import { WebsocketService } from 'src/websocket/websocket.service';
//import { MessagesGateway } from 'src/messages/messages.gateway';
//import { HandleConnectionHandler } from 'src/messages/handlers/handle-connection.handler';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepo: Repository<Group>,
    @InjectRepository(UsersGroups)
    private usersGroupsRepo: Repository<UsersGroups>,
    @InjectRepository(Message)
    private messagesRepo: Repository<Message>,
    private readonly websocketService: WebsocketService
    
  ) {}

  async create(dto: CreateGroupDto, adminId: number) {
    const admin = { id: adminId } as User;
    const userIds = [...new Set([...dto.userIds, adminId])];

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
      this.websocketService.subscribeUserToGroup(userId, savedGroup.id);
    }

    this.websocketService.emitToRoom(`group_${savedGroup.id}`, 'new_group', {
      id: savedGroup.id,
      name: savedGroup.name,
    })
  
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

    const messages = await this.messagesRepo.find({
      where: { group: { id: group.id }, ai: false },
      order: { createdAt: 'ASC' },
      relations: ['sender', 'replyTo', 'replyTo.sender'],
    });

    const usersCount = await this.usersGroupsRepo.count({
      where: { group: { id: group.id } },
    });

    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      sortDate: messages.length > 0
        ? messages[messages.length - 1].createdAt
        : group.createdAt,
      messages: messages.map(m => ({
        id: m.id,
        text: m.text,
        username: m.sender?.username,
        createdAt: m.createdAt,
        me: m.sender?.id === userId,
        userId: m.sender?.id,
        status: 'success',
        reply: m.replyTo
          ? {
              id: m.replyTo.id,
              text: m.replyTo.text,
              username: m.replyTo.sender?.username ?? null,
            }
          : null,
      })),
      messagesCount: messages.length,
      usersCount: usersCount,
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
      await this.messagesRepo.delete({ group: { id: groupId } });
      await this.usersGroupsRepo.delete({ group: { id: groupId } });
      await this.groupsRepo.delete({ id: groupId });
      this.websocketService.emitToRoom(`group_${groupId}`, 'delete_group', { id: groupId})
      return { deletedGroup: true };
    } else {
      await this.usersGroupsRepo.delete({ id: userGroup.id });
      return { deletedGroup: false };
    }
  }



 async deleteUserFromGroup(
  groupId: number,
  userId: number,
  senderId: number
): Promise<{ deletedGroup: boolean }> {

  const group = await this.groupsRepo.findOne({
    where: { id: groupId },
    relations: ['admin'],
  });
  if (!group) throw new NotFoundException('Группа не найдена');


  if (group.admin.id !== senderId) {
    throw new ForbiddenException('Только админ может удалять участников');
  }

  const userGroup = await this.usersGroupsRepo.findOne({
    where: {
      group: { id: groupId },
      user: { id: userId },
    },
    relations: ['user', 'group'],
  });
  if (!userGroup) throw new NotFoundException('Пользователь не состоит в группе');

  await this.usersGroupsRepo.delete({ group: { id: groupId }, user: { id: userId } });

  this.websocketService.emitToUser(userId, 'delete_group', { id: groupId})

  return { deletedGroup: false };
}

  async addUsersToGroup(
  groupId: number,
  userIds: number[],
  senderId: number,
): Promise<{ added: number[] }> {

  const group = await this.groupsRepo.findOne({
    where: { id: groupId },
    relations: ['admin'],
  });
  if (!group) throw new NotFoundException('Группа не найдена');
  if (group.admin.id !== senderId) {
    throw new ForbiddenException('Только админ может добавлять участников');
  }

  const existingUserGroups = await this.usersGroupsRepo.find({
    where: { group: { id: groupId } },
    relations: ['user'],
  });
  const existingUserIds = new Set(existingUserGroups.map(ug => ug.user.id));

  const toAdd = userIds.filter(id => !existingUserIds.has(id));
  if (toAdd.length === 0) return { added: [] };

  const newUsersGroups = toAdd.map(userId => this.usersGroupsRepo.create({
    group: group,
    user: { id: userId } as User,
  }));

  await this.usersGroupsRepo.save(newUsersGroups);

  const messages = await this.messagesRepo.find({
    where: { group: { id: groupId }, ai: false },
    order: { createdAt: 'ASC' },
    relations: ['sender'],
  });

  const messagesForEmit = messages.map(m => ({
    id: m.id,
    text: m.text,
    username: m.sender.username,
    createdAt: m.createdAt,
  }));

  const usersCount = await this.usersGroupsRepo.count({
    where: { group: { id: groupId } },
  });

  toAdd.forEach(userId => {
    this.websocketService.subscribeUserToGroup(userId, groupId);

    this.websocketService.emitToRoomExceptUser(
      `group_${groupId}`,
      'new_group',
      {
        id: groupId,
        name: group.name,
        messages: messagesForEmit,
        messagesCount: messagesForEmit.length,
        usersCount: usersCount,
      },
      senderId
    );
  });

  return { added: toAdd };
}


  
  


}
