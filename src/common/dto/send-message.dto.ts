import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  
  @IsInt()
  senderId: number;

  @IsOptional()
  @IsInt()
  groupId: number;

  @IsOptional()
  @IsBoolean()
  ai?: boolean;

  @IsOptional()
  @IsBoolean()
  aiAnswer?: boolean;

  @IsString()
  text: string;
}
