import {
    Controller,
    Post,
    Delete,
    Body,
    UseGuards,
  } from '@nestjs/common';
  import { UsersGroupsService } from './users_groups.service';
  import { AddUserToGroupDto } from '../common/dto/add-user-to-group.dto';
  import { AuthGuard } from '@nestjs/passport';
  
  @UseGuards(AuthGuard('jwt'))
  @Controller('users-groups')
  export class UsersGroupsController {
    constructor(private readonly usersGroupsService: UsersGroupsService) {}
  
    @Post()
    add(@Body() dto: AddUserToGroupDto) {
      return this.usersGroupsService.addUserToGroup(dto);
    }
  
    @Delete()
    remove(@Body() dto: AddUserToGroupDto) {
      return this.usersGroupsService.removeUserFromGroup(dto);
    }
  }
  