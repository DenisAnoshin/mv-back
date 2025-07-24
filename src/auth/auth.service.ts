import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    return user;
  }

  async login(user: User) {
    await this.usersService.updateLoginTime(user.id);
    const payload = { username: user.username, sub: user.id };
    return {
      token: this.jwtService.sign(payload),
      username: user.username,
      id: user.id
    };
  }

  async register(data: { username: string; password: string }) {
    const username = data.username.trim();
    if (!username) {
      throw new BadRequestException('Username cannot be empty');
    }

    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    return this.login(user);
  }


  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }

}
