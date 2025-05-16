import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './messages.entity';
import { Repository } from 'typeorm';
import { SendMessageDto } from '../common/dto/send-message.dto';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { UsersGroups } from 'src/users_groups/users_groups.entity';
import { OpenrouterService } from 'src/openrouter/openrouter.service';

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

    private readonly openrouterService: OpenrouterService
  ) {}


  async getUserGroups(userId: number): Promise<Group[]>  {
    const userGroups = await this.groupUserRepository.find({
      where: { user: { id: userId } },
      relations: ['group'],
    });

    return userGroups.map((ug) => ug.group);
  }

  async getMessagesForGroupAi(groupId: number, userId: number): Promise<
    Array<{ text: string; createdAt: Date; username: string }>
  > {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const sender = await this.userRepo.findOne({ where: { id: userId } });
    if (!sender) throw new NotFoundException('Sender not found');

    const messages = await this.messageRepo.find({
      where: { group: { id: groupId }, ai: true, sender },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages.map((msg) => ({
      text: msg.text,
      createdAt: msg.createdAt,
      username: msg.aiAnswer ? 'AI' : msg.sender?.username,
    }));
  }

  async getMessagesForGroup(groupId: number, userId: number): Promise<
    Array<{ text: string; createdAt: Date; username: string }>
  > {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');


    const messages = await this.messageRepo.find({
      where: { group: { id: groupId }, ai: false},
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages.map((msg) => ({
      text: msg.text,
      createdAt: msg.createdAt,
      username: msg.sender?.username,
      me: msg.sender?.id == userId,
    }));
  }

  formatMessages(messages: { text: string; createdAt: Date; username: string }[]): string {
    return messages
      .map((msg) => `[${msg.username} - ${msg.createdAt.toISOString()}]\n${msg.text}`)
      .join('\n\n');
  }


  async sendMessage(dto: SendMessageDto): Promise<Message> {
    const sender = await this.userRepo.findOne({ where: { id: dto.senderId } });

    let group = null;

    if (dto.groupId) {
      group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
      if (!group) throw new NotFoundException('Group not found');
    }

    const message = this.messageRepo.create({
      text: dto.text,
      sender,
      group,
    });

    return this.messageRepo.save(message);
  }

  async sendMessageAi(dto: SendMessageDto): Promise<any> {
    const sender = await this.userRepo.findOne({ where: { id: dto.senderId } });
    if (!sender) throw new NotFoundException('Sender not found');


    let group = null;
    const messageUser = dto.text;

    if (dto.groupId) {
      group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
      if (!group) throw new NotFoundException('Group not found');
    }

    const contextDialogBd = await this.getMessagesForGroup(dto.groupId, dto.senderId);
    const contextDialog = this.formatMessages(contextDialogBd);

    const contextAiDb = await this.getMessagesForGroupAi(dto.groupId, dto.senderId);
    const contextAi = this.formatMessages(contextAiDb);

    const content = `

        

        Вот мой вопрос.
        ${messageUser}
        
        Проведи анализ данной переписке и ответь на вопрос коротко, лаконично, без лишней воды, по существу, потвечай прямо на вопрос.
        ${contextDialog}


        `;

        //console.log(content)
    
    try{
      const message = this.messageRepo.create({
        text: dto.text,
        sender,
        group,
        ai: true
      });
  
      this.messageRepo.save(message)

      const aiResponse = await this.openrouterService.getAIResponse([
        {
          role: 'user',
          content,
        },
      ]);

      const messageAi = this.messageRepo.create({
        text: aiResponse,
        sender,
        group,
        ai: true,
        aiAnswer: true
      });
  
      this.messageRepo.save(messageAi);

      return { message: aiResponse };
    }catch (error) {
      console.error('Error calling OpenRouter API:', error.response?.data || error.message);
      return { message: 'Error' };
     // throw new Error('Failed to get AI response');
    }

  

    
  }
}
