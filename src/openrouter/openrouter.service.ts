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
      // 3ad914d8b04a7dd95d145c9a72998791c133694439047f088c66119c2d99c45e
      console.log(process.env.OPENROUTER_API_KEY)
      const response = await this.httpService.axiosRef.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1-nano',
          messages,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
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