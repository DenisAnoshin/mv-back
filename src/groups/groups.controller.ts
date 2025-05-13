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
  
  @UseGuards(AuthGuard('jwt'))
  @Controller('groups')
  export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}
  
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

    @Get(':id/messages')
    async getLastMessages(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<Message[]> {
      const messages = await this.groupsService.getLastMessagesInGroup(id, req.user.userId);
      return messages;
    }
  }
  