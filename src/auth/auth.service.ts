import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    return user;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      token: this.jwtService.sign(payload),
      username: user.username
    };
  }

  async register(data: { username: string; password: string }) {
    const existing = await this.userRepository.findOne({ where: { username: data.username } });
    if (existing) throw new UnauthorizedException('User already exists');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      username: data.username,
      password: hashedPassword,
    });
    await this.userRepository.save(user);
    return this.login(user);
  }
}
