import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './messages.entity';
import { Repository } from 'typeorm';
import { SendMessageDto } from '../common/dto/send-message.dto';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { UsersGroups } from 'src/users_groups/users_groups.entity';
//import { OpenrouterService } from 'src/openrouter/openrouter.service';
import { WebsocketService } from 'src/websocket/websocket.service';
import { OpenAIService } from 'src/openai/openai.service';
//import { MessagesGateway } from './messages.gateway';
//import { HandleConnectionHandler } from './handlers/handle-connection.handler';
//import { WebsocketService } from 'src/websocket/websocket.gateway';

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

    private readonly openAIService: OpenAIService,

    private readonly websocketService: WebsocketService
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
      id: msg.id,
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
      id: msg.id
    }));
  }

  formatMessages(messages: { text: string; createdAt: Date; username: string }[]): string {
    return messages
      .map((msg) => `[${msg.username} - ${msg.createdAt.toISOString()}]\n${msg.text}`)
      .join('\n\n');
  }

  async deleteMessageById(messageId: number, userId: number): Promise<any> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.id !== userId) {
      throw new Error('You are not the owner of this message');
    }

    const res = await this.messageRepo.delete(messageId);

    return res;
  }


  async sendMessageWithEmit(dto: SendMessageDto) {
  const sender = await this.userRepo.findOne({ where: { id: dto.senderId } });
  if (!sender) throw new NotFoundException('Sender not found');

  let group = null;
  if (dto.groupId) {
    group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Group not found');
  }

  let replyTo = null;
  if (dto.replyId) {
    replyTo = await this.messageRepo.findOne({
      where: { id: dto.replyId },
      relations: ['sender'],
    });
    if (!replyTo) throw new NotFoundException('Replied message not found');
  }

  const message = this.messageRepo.create({
    text: dto.text,
    sender,
    group,
    replyTo,
    ai: dto.ai ?? false,
    aiAnswer: dto.aiAnswer ?? false,
  });

  const savedMessage = await this.messageRepo.save(message);

  const replyPayload = replyTo
    ? {
        id: replyTo.id,
        text: replyTo.text,
        username: replyTo.sender?.username ?? null,
      }
    : null;

  const payload = {
    id: savedMessage.id,
    text: savedMessage.text,
    username: sender.username,
    userId: dto.senderId,
    status: 'success',
    groupId: dto.groupId,
    createdAt: savedMessage.createdAt,
    senderId: dto.senderId,
    me: false,
    reply: replyPayload,
  };

  this.websocketService.emitToRoomExceptUser(`group_${dto.groupId}`, 'new_message', payload, dto.senderId);

  return {
    ...payload,
    me: true, 
  };
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

    const messageSave = await this.messageRepo.save(message);

    return messageSave;
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
        
        Проведи анализ данной переписке и ответь на вопрос коротко, лаконично, без лишней воды, по существу.
        ${contextDialog}

        `;

    
    try{
      const message = this.messageRepo.create({
        text: dto.text,
        sender,
        group,
        ai: true
      });
  
      await this.messageRepo.save(message)

      const aiResponse = await this.openAIService.generateResponse(content);

      const messageAi = this.messageRepo.create({
        text: aiResponse,
        sender,
        group,
        ai: true,
        aiAnswer: true
      });
  
      await this.messageRepo.save(messageAi);

      return { message: aiResponse };
    }catch (error) {
      console.error('Error calling OpenRouter API:', error.response?.data || error.message);
      return { message: 'Error' };
    } 
  }


  async getSummaryMessagesForGroup(groupId: number, senderId: number): Promise<any> {
    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');


    let group = null;

    if (groupId) {
      group = await this.groupRepo.findOne({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');
    }

    const contextDialogBd = await this.getMessagesForGroup(groupId, senderId);
    const contextDialog = this.formatMessages(contextDialogBd);

    const content = `
        
        Ниже представленна история переписки из чата. Твоя задача провести анализ этих сообщений, и дать краткую сводку. 
        Постарайся выделить ключевые и важные сообщения и сделать на них акцент.

        Используй переносы строк и красивое форматирование текста для более удобного чтения.
        
        Вот история переписки чата.
        ${contextDialog}


        `;
    
    try{

      const aiResponse =  await this.openAIService.generateResponse(content);

      return { message: aiResponse };
    }catch (error) {
      console.error('Error calling OpenRouter API:', error.response?.data || error.message);
      return { message: 'Error' };
    } 
  }


  async generateUserAiProfile(dto: { groupId: number, senderId: number }): Promise<any> {
  const sender = await this.userRepo.findOne({ where: { id: dto.senderId } });
  if (!sender) throw new NotFoundException('Sender not found');

  // Получаем переписку пользователя (или всей группы, если надо)
  const messages = await this.getMessagesForGroup(dto.groupId, dto.senderId);
  const formattedMessages = this.formatMessages(messages);

  // Формируем промт для AI
  const aiPrompt = `
Ты — помощник, который на основании истории сообщений пользователя должен сгенерировать JSON-профиль пользователя.
Используй ТОЛЬКО следующую схему:

{
  "nickname": "string",
  "categories": ["string"],
  "emotionLevel": "number (0..1)",
  "emotionLabel": "string",
  "messagesCount": "integer",
  "activityLevel": "number (0..1)",
  "avatarUrl": "string|null",
  "status": "string",
  "statusColor": "hex string (#RRGGBB)",
  "favoriteEmoji": "string (emoji)",
  "badges": [{ "icon": "string (emoji)", "label": "string" }],
  "activityLast7Days": ["number (0..1)"],
  "quote": "string",
  "emotionTimeline": ["number (0..1)"],
  "aiAdvice": "string",
  "aiProfileSummary": "string",
  "socialCircle": [{ "name": "string", "emoji": "string (emoji)" }],
  "aiAchievements": ["string"],
  "aiHeadline": "string",
  "timeInApp": ["number (часы за день)"],
  "aiStyle": "string",
  "aiCurrentMood": "string",
  "aiSupportScore": "number (0..1)",
  "lastOnline": "string",
  "online": "boolean"
}

**Описание каждого поля:**
nickname: Имя или ник пользователя.
categories: Список интересов пользователя.
emotionLevel: Эмоциональный уровень пользователя (float, 0 = минимум, 1 = максимум).
emotionLabel: Название текущей эмоции.
messagesCount: Количество отправленных сообщений (integer).
activityLevel: Уровень активности (float 0..1).
avatarUrl: Ссылка на аватар или null.
status: Текстовый статус пользователя (например, “В сети”).
statusColor: Цвет статуса в hex (#RRGGBB).
favoriteEmoji: Любимый эмодзи пользователя.
badges: Массив объектов {icon, label}.
activityLast7Days: Список активности за последние 7 дней (float 0..1).
quote: Персональная цитата.
emotionTimeline: Значения эмоций за неделю (float 0..1).
aiAdvice: Советы от AI по улучшению состояния.
aiProfileSummary: Краткое AI-резюме профиля.
socialCircle: Социальный круг пользователя — массив объектов {name, emoji}.
aiAchievements: AI-определённые достижения (массив string).
aiHeadline: Краткое описание пользователя от AI.
timeInApp: Массив чисел, часы в приложении по дням.
aiStyle: Описание стиля общения пользователя.
aiCurrentMood: Текущее настроение.
aiSupportScore: Оценка поддержки от других (float 0..1).
lastOnline: Время последнего онлайн.
online: true/false.

Вот история сообщений пользователя:
${formattedMessages}

Если информации недостаточно для заполнения какого-либо поля — поставь нейтральные значения: пустые строки, нули, null или массивы из нулей. Отвечай ТОЛЬКО валидным JSON.
  `;

  try {
    // const aiResponse = await this.openrouterService.getAIResponse([
    //   { role: 'user', content: aiPrompt },
    // ]);

   // const res = JSON.parse(aiResponse);
    //const validProfile = validateAndFixAiProfile(res);


    // Можно добавить парсинг или валидацию JSON тут
    return { aiProfile: 'validProfile' };
  } catch (error) {
    console.error('Error calling AI:', error.response?.data || error.message);
    return { error: 'Error generating AI profile' };
  }
  
}



}
