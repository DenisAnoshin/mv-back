// src/openrouter/openrouter.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenrouterService } from './openrouter.service';

@Module({
  imports: [HttpModule],
  providers: [OpenrouterService],
  exports: [OpenrouterService], 
})
export class OpenrouterModule {}
