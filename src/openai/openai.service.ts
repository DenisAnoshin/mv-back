import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(prompt: string, model: string = 'gpt-4.1-nano'): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
      });

      return response.choices[0]?.message?.content || 'No response from OpenAI';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate response from OpenAI');
    }
  }
}