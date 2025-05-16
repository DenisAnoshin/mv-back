import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
    Request
  } from '@nestjs/common';
  import { GroupsService } from './groups.service';
  import { CreateGroupDto } from '../common/dto/create-group.dto';
  import { AuthGuard } from '@nestjs/passport';
import { Message } from 'src/messages/messages.entity';
import { MessagesService } from 'src/messages/messages.service';
  
  @UseGuards(AuthGuard('jwt'))
  @Controller('groups')
  export class GroupsController {
    constructor(
      private readonly groupsService: GroupsService,
      private readonly messagesService: MessagesService

    ) {}
  
    @Post()
    create(@Body() dto: CreateGroupDto, @Request() req) {
      return this.groupsService.create(dto, req.user.userId);
    }
  
    @Get()
    findAll() {
      return this.groupsService.findAll();
    }
  
    @Get(':id/users')
    findUsers(@Param('id', ParseIntPipe) id: number) {
      return this.groupsService.findUsersInGroup(id);
    }
  
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.groupsService.remove(id);
    }

    @Get('my')
    getMyGroups(@Request() req) {
      return this.groupsService.findGroupsForUser(req.user.userId);
    }

    @Get(':id/info')
    getGroupInfo(@Param('id', ParseIntPipe) id: number, @Request() req) {
      return this.groupsService.getGroupInfo(id, req.user.userId);
    }

    @Post(':id/leave')
    leaveGroup(@Param('id', ParseIntPipe) id: number, @Request() req) {
      return this.groupsService.leaveGroup(id, req.user.userId);
    }

    

  }
  