import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './messages.entity';
import { Repository } from 'typeorm';
import { SendMessageDto } from '../common/dto/send-message.dto';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { UsersGroups } from 'src/users_groups/users_groups.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,

    @InjectRepository(UsersGroups)
    private readonly groupUserRepository: Repository<UsersGroups>,
  ) {}


  async getUserGroups(userId: number): Promise<Group[]>  {
    const userGroups = await this.groupUserRepository.find({
      where: { user: { id: userId } },
      relations: ['group'],
    });

    return userGroups.map((ug) => ug.group);
  }

  async sendMessage(dto: SendMessageDto): Promise<Message> {
    const sender = await this.userRepo.findOne({ where: { id: dto.senderId } });
    if (!sender) throw new NotFoundException('Sender not found');

    let recipient = null;
    let group = null;

    if (dto.recipientId) {
      recipient = await this.userRepo.findOne({ where: { id: dto.recipientId } });
      if (!recipient) throw new NotFoundException('Recipient not found');
    }

    if (dto.groupId) {
      group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
      if (!group) throw new NotFoundException('Group not found');
    }

    const message = this.messageRepo.create({
      text: dto.text,
      sender,
      recipient,
      group,
    });

    return this.messageRepo.save(message);
  }
}
