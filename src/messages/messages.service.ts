import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './messages.entity';
import { Repository } from 'typeorm';
import { SendMessageDto } from '../common/dto/send-message.dto';
import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { UsersGroups } from 'src/users_groups/users_groups.entity';
import { OpenrouterService } from 'src/openrouter/openrouter.service';
import { WebsocketService } from 'src/websocket/websocket.service';
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

    private readonly openrouterService: OpenrouterService,

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

    const savedMessage = await this.messageRepo.save(message);

    this.websocketService.emitToRoomExceptUser(`group_${dto.groupId}`, 'new_message', {
      id: savedMessage.id,
      text: savedMessage.text,
      username: sender.username,
      groupId: dto.groupId,
      createdAt: savedMessage.createdAt,
      senderId: dto.senderId
    }, dto.senderId);
    
    return  {
      id: savedMessage.id,
      text: savedMessage.text,
      username: sender.username,
      groupId: dto.groupId,
      createdAt: savedMessage.createdAt,
      me: true
    }

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
        
        Ниже представленна история переписки из чата. Твоя задача провести анализ этих сообщений, и дать сводку. 
        Постарайся выделить ключевые и важные сообщения и сделать на них акцент.
        
        Вот история переписки чата.
        ${contextDialog}


        `;
    
    try{

      // const aiResponse = await this.openrouterService.getAIResponse([
      //   {
      //     role: 'user',
      //     content,
      //   },
      // ]);

      
      const aiResponse = `Анализ переписки показывает, что это группа друзей активно обсуждает подготовку к совместной поездке в Грузию, запланированную на конец июня — начало июля 2025 года. Вот основные моменты и ключевые темы переписки:

1. **Планирование дат и маршрута**:
   - Все участники согласны, что оптимальное время — с 20 июня по 5 июля.
   - Рассматриваются города: Тбилиси, Казбеги, Батуми, регион Кахетия, а также идея посетить винодельни и попробовать местную кухню (хинкали, хачапури, чурчхела).

2. **Бюджет и расходы**:
   - Средняя стоимость ночевки — от 100$ до 150$ за ночь на троих.
   - Общий бюджет на человека — примерно 500-700$, обсуждается вариативность в зависимости от жилья и активности.
   - Расходы на питание — около 20-25$ в день.
   - Проговаривался вопрос о бюджете на еду, страховке, мобильной связи и экскурсиях.

3. **Жильё и транспорт**:
   - Найдены уютные квартиры в Тбилиси за около 120$ за ночь.
   - Обсуждается возможность бронирования через Airbnb или Booking.
   - Предлагается сделать группу в Telegram для координации.

4. **Сопутствующие вопросы**:
   - Страховка — один из участников уже проверил, действует до 2027 года, есть предложение застраховать всех.
   - Визы — вопрос, кто займётся оформлением.
   - Мобильная связь — приобретение местной сим-карты по прилёту.
   - Одежда — обсуждение необходимости взять тёплую одежду для гор (флиску).
   - Аптечка — кто возьмёт с собой.

5. **Дополнительные идеи и активности**:
   - Посещение винодельных и дегустации.
   - Попытки организовать экскурсии.
   - Открытость к новым впечатлениям и горячий энтузиазм в планировании путешествия.

**Ключевые акценты:**
- Участники настроены позитивно и уже активно выбирают маршруты, жильё, оценивают бюджетные расходы.
- Есть общее согласие по датам, а также желание использовать современные инструменты (Telegram) для координации.
- Основные бытовые вопросы (визы, страховки, связь, экипировка) уже обсуждаются.

Общая сводка: команда друзей активно планирует насыщенное путешествие по Грузии летом 2025 года, обсуждая детали бюджета, маршрута, жилья и активности, проявляя высокий уровень энтузиазма и готовности к совместному приключению.`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Ждём 1 секунду...');
await sleep(3000).then(() => console.log('Прошла 1 секунда'));

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
    const aiResponse = await this.openrouterService.getAIResponse([
      { role: 'user', content: aiPrompt },
    ]);

    const res = JSON.parse(aiResponse);
    const validProfile = validateAndFixAiProfile(res);


    // Можно добавить парсинг или валидацию JSON тут
    return { aiProfile: validProfile };
  } catch (error) {
    console.error('Error calling AI:', error.response?.data || error.message);
    return { error: 'Error generating AI profile' };
  }
  
}



}
