import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class RequestSnippets {
  @IsInt()
  senderId: number;

  @IsInt()
  groupId: number;
}
