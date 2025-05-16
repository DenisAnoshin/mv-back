// src/openrouter/openrouter.service.ts
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class OpenrouterService {
  constructor(private readonly httpService: HttpService) {}

  async getAIResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'anthropic/claude-3-haiku',
          messages,
        },
        {
          headers: {
            'Authorization': `Bearer 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`,
            'HTTP-Referer': 'http://37.220.82.230',
            'X-Title': 'openmv',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenRouter API:', error.response?.data || error.message);
      throw new Error('Failed to get AI response');
    }
  }
}