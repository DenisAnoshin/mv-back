import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};
@Injectable()
export class OpenAIService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  

async generateResponse(
  prompt: string,
  system: string = '',
  assistant: ChatMessage[] = [],
  model: string = 'gpt-4.1-mini',
): Promise<string> {
  try {
    const messages: ChatMessage[] = assistant;

    if (system) {
      messages.push({ role: 'system', content: system });
    }

    if (prompt) {
      messages.push({ role: 'user', content: prompt });
    }


    const response = await this.client.chat.completions.create({
      model,
      messages,
    });

    return response.choices[0]?.message?.content || 'No response from OpenAI';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate response from OpenAI');
  }
}

}