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
import { ChatMessage, OpenAIService } from 'src/openai/openai.service';
import { RequestSnippets } from 'src/common/dto/request-snippets.dto';
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

  async buildAiMessageHistory(groupId: number, userId: number): Promise<ChatMessage[]> {
    const rawMessages = await this.getMessagesForGroupAi(groupId, userId);

    const chatMessages: ChatMessage[] = rawMessages.map((msg) => ({
      role: msg.username === 'AI' ? 'assistant' : 'user',
      content: msg.text,
    }));

    return chatMessages;
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

    const contextAi = await this.buildAiMessageHistory(dto.groupId, dto.senderId);

    const system = `
Ты — встроенный AI-ассистент внутри мессенджера.

Ты — встроенный AI-ассистент внутри мессенджера.

Твоя цель:
Помогать пользователю быстро, понятно и по делу. Уточнять мысли, структурировать идеи, подсказывать лучшие действия в рамках переписки. Держать разговор логичным и продуктивным.

Тон общения:
- Пиши кратко и по делу.
- Будь дружелюбным, но профессиональным.
- Формулируй мысли так, чтобы их было удобно читать с телефона (UX-стиль: короткие блоки, списки, акценты).

🔹 Формат ответа:
- Используй **Markdown**: **жирный текст**, *курсив*, списки, цитаты.
- Разделяй мысли на короткие абзацы.
- При необходимости — давай пошаговые действия.

🔹 Поведение:
- Отвечай строго по теме текущего диалога. Не уводи разговор в сторону.
- Если сообщение неполное или неясное — вежливо уточни:
«Поясни, пожалуйста, что именно ты имеешь в виду — так я точнее помогу.»

---

###  Спец-функции:

1. Реакция на короткие команды:
- Если ты **предложил** пользователю что-то (например: «Могу структурировать», «Могу помочь с оформлением», «Хочешь, покажу пример?»), и пользователь отвечает:
  - «Хочу»
  - «Давай»
  - «Ок»
  - «Поехали»
  - «Да»
  - «Запусти»
  
 Это считается **подтверждением**. Сразу **выполняй своё предложение**, не спрашивай дополнительно.

Пример:
Могу помочь оформить идею как презентацию.  
Хочу  
Отвечай: «Хорошо! Вот структура презентации…» — без лишних уточнений.

---

2. Инициативность:
- Если видишь, что пользователь не уверен или путается — предложи варианты:
  - «Хочешь, разобью это на части?»
  - «Могу задать пару наводящих вопросов.»
  - «Нужен пример?»

---

3. Помощь в формулировке:
- Если человек пишет сумбурно, помоги оформить мысль красиво и структурированно. Не критикуй — помоги.


---

4. Язык:
- Используй язык и стиль, соответствующий предыдущим сообщениям пользователя: неформальный или деловой, русский или английский.

Вот история мессенджера.
${contextDialog}


`;

const promt = messageUser;

    
    try{
      const message = this.messageRepo.create({
        text: dto.text,
        sender,
        group,
        ai: true
      });
  
      await this.messageRepo.save(message)

      const aiResponse = await this.openAIService.generateResponse(promt, system, contextAi);

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

    const system = `

      Ниже представленна история переписки из чата. 
      
      Твоя задача прислать:
      Краткое содержание (1-2 предложения, общий смысл и суть чата).
      Участники: имена и роли в чате. тезисно
      Тон общения (деловой, формальный и т.д)
      Активность (низкая - высокая)
      Ключевые события / решения (важные договорённости, решения, события, изменения).
      Акценты и детали (дополнительная информация, акценты или шутливые моменты, которые дают контекст)

      Присылай мне текст в Markdown-стиле. Используй:
      Жирное выделение ** для имён или важных слов
      Маркированный список с -
      Структурированные описания после тире — и т.д.
      Используй также разделители линии для отделение блоков по мыслу или типу внутри текста.
      Не ставь разделительную линию перед текстом вначале..
      Не ставь разделительную линию в конце, после текста.
      Также между разделительными линиями должен быть один перенос строки или отступ, иначе текст к линии слишком близок.
      Если делаешь список обязательно название списка в жирном стиле, чтобы он отличался от самого списка.
    `;

    
    try{

      const aiResponse =  await this.openAIService.generateResponse(contextDialog, system, []);

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


async getSnippets(dto: RequestSnippets): Promise<any> {
    const sender = await this.userRepo.findOne({ where: { id: dto.senderId } });
    if (!sender) throw new NotFoundException('Sender not found');


    let group = null;

    if (dto.groupId) {
      group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
      if (!group) throw new NotFoundException('Group not found');
    }

    const contextDialogBd = await this.getMessagesForGroup(dto.groupId, dto.senderId);
    const contextDialog = this.formatMessages(contextDialogBd);

    const system = `
    Проведи анализ данной переписке и пришли мне от 3 до 5 снипетов с текстом в json формате в виде массива. 
        Формат { "snippets": ["snippet1", "snippet2", "snippet3"] }
        нужно чтобы ты определил ключевые вопросы, которые могут быть интересны пользователю, глядя на эту переписку.
        Пример снипетов: О чем чат? Куда решили ехать? Кто инициатор поездки?
        Также снипеты должны быть максимально короткие, они будут на телефоне в одну строку в виде кнопок.
        Твои снипеты буду предназначены для AI асистента, не для пользователей. Эти снипеты нужны чтобы лучше помочь узнать пользователю что-то о чате.
        Сформируй такой список снипетов, чтобы пользовтаелю было удобно и быстро спросить что-то важное и ключевое о чате в котором он находится. 
        Отвечай только валидным json!!! Это очень важно, твой ответ парсит JSON.parse.
        Изучи переписку, если трудно определить снипеты, или слишком короткая переписка, присылай пустой массив. 
        Ниже переписка:
    `;

    try{

      const aiResponse = await this.openAIService.generateResponse(contextDialog, system, []);

      const res: any = JSON.parse(aiResponse);  
     
      res.snippets = [
        'Что происходит в чате?',
        'Дай характеристику участников',
        'Есть ли какие-то решения?',
        ...res.snippets
      ]

      return  res;
    }catch (error) {
      console.error('Error calling OpenRouter API:', error.response?.data || error.message);
      return {snippets: []};
    } 
  }



}
