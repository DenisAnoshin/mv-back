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
}
