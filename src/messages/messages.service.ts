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

  // Returns group ids that both users share
  private async getMutualGroupIds(userAId: number, userBId: number): Promise<number[]> {
    const rows = await this.groupUserRepository
      .createQueryBuilder('ug')
      .select('ug.groupId', 'groupId')
      .where('ug.userId IN (:...userIds)', { userIds: [userAId, userBId] })
      .groupBy('ug.groupId')
      .having('COUNT(DISTINCT ug.userId) = 2')
      .getRawMany();

    return rows.map((r: any) => Number(r.groupId));
  }

  private buildDefaultAiProfileData() {
    return {
      data: {
        avatarUrl: null,
        quote: '',
        headline: '',
        favoriteEmoji: '',
        online: false,
        lastOnline: '',
        emotionLevel: 0.0,
        emotionLabel: '',
        emotionTimeline: [],
        aiCurrentMood: '',
        aiProfileSummary: '',
        aiAdvice: '',
        aiSupportScore: 0.0,
        messagesCount: 0,
        activityLevel: 0.0,
        badges: [],
        timeInApp: [],
        categories: [],
        aiAchievements: [],
        aiStyle: '',
        aiHowUserCanHelp: ''
      }
    };
  }

  private normalizeAiProfile(raw: any) {
    const def = this.buildDefaultAiProfileData();
    const out = { ...def };
    if (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object') {
      const d = raw.data;
      out.data.avatarUrl = d.avatarUrl ?? def.data.avatarUrl;
      out.data.quote = typeof d.quote === 'string' ? d.quote : def.data.quote;
      out.data.headline = typeof d.headline === 'string' ? d.headline : def.data.headline;
      out.data.favoriteEmoji = typeof d.favoriteEmoji === 'string' ? d.favoriteEmoji : def.data.favoriteEmoji;
      out.data.online = typeof d.online === 'boolean' ? d.online : def.data.online;
      out.data.lastOnline = typeof d.lastOnline === 'string' ? d.lastOnline : def.data.lastOnline;
      const clamp01 = (n: any) => {
        const num = typeof n === 'number' ? n : 0;
        return Math.max(0, Math.min(1, num));
      };
      out.data.emotionLevel = clamp01(d.emotionLevel);
      out.data.emotionLabel = typeof d.emotionLabel === 'string' ? d.emotionLabel : def.data.emotionLabel;
      out.data.emotionTimeline = Array.isArray(d.emotionTimeline) ? d.emotionTimeline.filter((x: any) => typeof x === 'number').map(clamp01) : def.data.emotionTimeline;
      out.data.aiCurrentMood = typeof d.aiCurrentMood === 'string' ? d.aiCurrentMood : def.data.aiCurrentMood;
      out.data.aiProfileSummary = typeof d.aiProfileSummary === 'string' ? d.aiProfileSummary : def.data.aiProfileSummary;
      out.data.aiAdvice = typeof d.aiAdvice === 'string' ? d.aiAdvice : def.data.aiAdvice;
      out.data.aiSupportScore = clamp01(d.aiSupportScore);
      out.data.messagesCount = Number.isInteger(d.messagesCount) && d.messagesCount >= 0 ? d.messagesCount : def.data.messagesCount;
      out.data.activityLevel = clamp01(d.activityLevel);
      out.data.badges = Array.isArray(d.badges)
        ? d.badges
            .filter((b: any) => b && typeof b === 'object')
            .map((b: any) => ({
              icon: typeof b.icon === 'string' ? b.icon : '',
              name: typeof b.name === 'string' ? b.name : '',
            }))
        : def.data.badges;
      out.data.timeInApp = Array.isArray(d.timeInApp) ? d.timeInApp.filter((x: any) => typeof x === 'number') : def.data.timeInApp;
      out.data.categories = Array.isArray(d.categories) ? d.categories.filter((x: any) => typeof x === 'string') : def.data.categories;
      out.data.aiAchievements = Array.isArray(d.aiAchievements) ? d.aiAchievements.filter((x: any) => typeof x === 'string') : def.data.aiAchievements;
      out.data.aiStyle = typeof d.aiStyle === 'string' ? d.aiStyle : def.data.aiStyle;
      out.data.aiHowUserCanHelp = typeof d.aiHowUserCanHelp === 'string' ? d.aiHowUserCanHelp : def.data.aiHowUserCanHelp;
    }
    return out;
  }

  private tryParseJsonStrict(text: string): any | null {
    try {
      return JSON.parse(text);
    } catch {
      // try to extract JSON between first { and last }
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        const slice = text.slice(first, last + 1);
        try { return JSON.parse(slice); } catch { return null; }
      }
      return null;
    }
  }

  private async getFormattedMutualMessagesContext(targetUserId: number, requesterUserId: number): Promise<{ formatted: string; messagesCount: number; }> {
    const mutualGroupIds = await this.getMutualGroupIds(targetUserId, requesterUserId);
    if (!mutualGroupIds.length) {
      return { formatted: '', messagesCount: 0 };
    }

    const allMessages: { text: string; createdAt: Date; username: string }[] = [];

    for (const gid of mutualGroupIds) {
      const msgs = await this.getMessagesForGroup(gid, requesterUserId);
      allMessages.push(...msgs.map(m => ({ text: m.text, createdAt: m.createdAt, username: m.username })));
    }

    // sort across groups by time
    allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return { formatted: this.formatMessages(allMessages), messagesCount: allMessages.length };
  }

  private async getFormattedOwnMessagesContext(userId: number): Promise<{ formatted: string; messagesCount: number; }> {
    const messages = await this.messageRepo.find({
      where: { sender: { id: userId }, ai: false },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    const mapped = messages.map((msg) => ({
      text: msg.text,
      createdAt: msg.createdAt,
      username: msg.sender?.username ?? 'me',
    }));

    return { formatted: this.formatMessages(mapped), messagesCount: mapped.length };
  }


  async generateUserAiProfile(targetUserId: number, requesterUserId: number ): Promise<any> {
  const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
  if (!targetUser) throw new NotFoundException('Target user not found');

  // collect context
  const isSelf = targetUserId === requesterUserId;
  const contextData = isSelf
    ? await this.getFormattedOwnMessagesContext(targetUserId)
    : await this.getFormattedMutualMessagesContext(targetUserId, requesterUserId);

  const contextDialog = contextData.formatted;
  const messagesCount = contextData.messagesCount;

  const lastLoginAt = targetUser.loginAt ? new Date(targetUser.loginAt) : null;
  const now = new Date();
  const minutesSince = lastLoginAt ? Math.floor((now.getTime() - lastLoginAt.getTime()) / 60000) : null;

  const contextLine = isSelf
    ? `- Источник: собственные сообщения пользователя; количество собранных сообщений: ${messagesCount}.`
    : `- Совместные чаты: ${contextDialog ? 'есть' : 'нет'}; количество собранных сообщений: ${messagesCount}.`;

  const system = `
Ты — аналитик профиля пользователя внутри мессенджера. Твоя задача — по истории переписок СГЕНЕРИРОВАТЬ строго JSON со сводной AI-картой профиля указанного пользователя.

Контекст:
- Просматриваем профиль пользователя с id=${targetUserId}, username="${targetUser.username}".
- Текущий пользователь, который смотрит профиль: id=${requesterUserId}.
- Последний вход пользователя (loginAt): ${lastLoginAt ? lastLoginAt.toISOString() : 'unknown'}.
${contextLine}

Требования к ответу:
- Верни ТОЛЬКО валидный JSON, БЕЗ лишнего текста.
- Структура:
{
  "data": {
    "avatarUrl": string|null,
    "quote": string,
    "headline": string,
    "favoriteEmoji": string,
    "online": boolean,
    "lastOnline": string,

    "emotionLevel": number,        // 0..1
    "emotionLabel": string,
    "emotionTimeline": number[],    // значения 0..1, длина 0..7
    "aiCurrentMood": string,
    "aiProfileSummary": string,
    "aiAdvice": string,
    "aiSupportScore": number,      // 0..1

    "messagesCount": number,       // целое >= 0 (можешь оценить по контексту)
    "activityLevel": number,       // 0..1 (оценка активности)
    "badges": [{ "icon": string, "name": string }],
    "timeInApp": number[],         // 0..24, длина 0..7 (можешь оценить)

    "categories": string[],
    "aiAchievements": string[],
    "aiStyle": string,
    "aiHowUserCanHelp": string     // чем этот пользователь может быть полезен другим: сильные стороны, экспертиза, примеры пользЫ
  }
}

Правила генерации:
- Если контекста мало — возвращай пустые/дефолтные значения (пустые строки/массивы, 0/false/null) и ничего не выдумывай.
- Если данные очевидны из истории — кратко отрази их.
- Поля emotionLevel, aiSupportScore, activityLevel и значения в emotionTimeline должны быть в диапазоне 0..1.
- "aiHowUserCanHelp" сформулируй 1–2 предложениями: где пользователь наиболее полезен, как он может помочь другим (наставничество, экспертиза, типичные вопросы/задачи).
- Верни только JSON без Markdown, без комментариев, без пояснений.
`;

  const prompt = isSelf
    ? `Ниже собраны собственные сообщения пользователя (он смотрит свой профиль):\n\n${contextDialog}`
    : `Ниже история сообщений из общих чатов (если пусто — чатов нет):\n\n${contextDialog}`;

  try {
    const aiText = await this.openAIService.generateResponse(prompt, system, []);
    const parsed = this.tryParseJsonStrict(aiText) ?? this.buildDefaultAiProfileData();
    const normalized = this.normalizeAiProfile(parsed);

    // Optionally enrich with some known numeric hints
    normalized.data.messagesCount = normalized.data.messagesCount || messagesCount;

    // online/lastOnline: compute strictly from loginAt with a 15-minute threshold
    if (minutesSince !== null) {
      normalized.data.online = minutesSince <= 15;
      if (normalized.data.lastOnline === '') {
        normalized.data.lastOnline = minutesSince === 0 ? 'just now' : `${minutesSince} minutes ago`;
      }
    }

    return normalized;
  } catch (error) {
    console.error('Error generating AI profile:', (error as any).response?.data || (error as any).message);
    return this.buildDefaultAiProfileData();
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

      //const aiResponse = await this.openAIService.generateResponse(contextDialog, system, []);

    //  const res: any = JSON.parse(aiResponse);  
      const res: any = {snippets: []}; //= JSON.parse(aiResponse);  
     
      res.snippets = [
        'Что ты можешь?',
        'Что происходит в чате?',
        'Дай характеристику участников',
        'Есть ли какие-то решения?',
       // ...res.snippets
      ]

      return  res;
    }catch (error) {
      console.error('Error calling OpenRouter API:', error.response?.data || error.message);
      return {snippets: []};
    } 
  }



}
