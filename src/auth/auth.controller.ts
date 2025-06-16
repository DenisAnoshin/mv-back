import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../common/dto/login.dto';
import { RegisterDto } from '../common/dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    const login = await this.authService.login(user);
    return login;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const res = await this.authService.register(registerDto);
    return res;
  }
}
