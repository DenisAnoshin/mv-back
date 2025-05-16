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
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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