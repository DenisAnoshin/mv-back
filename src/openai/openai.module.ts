import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}