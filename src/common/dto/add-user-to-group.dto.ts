import { IsInt } from 'class-validator';

export class AddUserToGroupDto {
  @IsInt()
  userId: number;

  @IsInt()
  groupId: number;
}
