import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(currentUserId: number): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'username'],
      where: {
        id: Not(currentUserId),
      },
    });
  }

  findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'username'], 
    });
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }


  async getProfile(userId: number) {

    //const user = await this.findOne(userId);
    return {
      nickname: 'user',
      categories: ["Sports", "Cars", "Music", "Travel", "IT"],
      emotionLevel: 0.76,
      emotionLabel: "Optimism",
      messagesCount: 1203,
      activityLevel: 0.63,
      avatarUrl: null,
      status: "Online",
      statusColor: "#69FF7A",
      favoriteEmoji: "🎸",
      badges: [
        { icon: "💬", label: "1000 messages" },
        { icon: "🚀", label: "Veteran" },
        { icon: "🔥", label: "Most Active" },
      ],
      activityLast7Days: [0.8, 0.5, 0.7, 1.0, 0.4, 0.9, 0.6],
      quote: "“Only forward, and with music!”",
      emotionTimeline: [0.55, 0.62, 0.68, 0.73, 0.70, 0.77, 0.65],

      aiAdvice: "AI recommends: take more rest 🌴",
      aiProfileSummary: "Extrovert, inspiring, loves meeting new people",
      socialCircle: [
      { "emoji": "🧑", "name": "Ivan", "role": "Friend", "chatCount": 3, "lastMessage": "Let’s catch up soon!" },
      { "emoji": "👩", "name": "Maria", "role": "Colleague", "chatCount": 2, "lastMessage": "Sent the report." },
      { "emoji": "🧑‍🦱", "name": "Artyom", "role": "Family", "chatCount": 1, "lastMessage": "Happy birthday!" },
    ],
      aiAchievements: ["Motivator", "Joker", "Calmness"],
      aiHeadline: "I inspire and support!",
      timeInApp: [1.2, 2.8, 3.0, 2.0, 3.5, 2.2, 1.5],
      aiStyle: "Positive, Creative",
      aiCurrentMood: "At the peak of motivation",
      aiSupportScore: 0.93,
      lastOnline: "today at 14:23",
      online: true
    };
  }
}
