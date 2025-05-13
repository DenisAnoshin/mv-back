import { IsInt, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  senderId: number;

  @IsOptional()
  @IsInt()
  recipientId?: number;

  @IsOptional()
  @IsInt()
  groupId?: number;

  @IsString()
  text: string;
}
