import {
    Controller,
 
    UseGuards,
    Post,
    Body,
    Request,
    Get,
    Param,
    ParseIntPipe,
    Delete
  } from '@nestjs/common';
  import { MessagesService } from './messages.service';
  import { AuthGuard } from '@nestjs/passport';
import { SendMessageDto } from 'src/common/dto/send-message.dto';

  
  @UseGuards(AuthGuard('jwt'))
  @Controller('messages')
  export class MessagesController {
    constructor(private readonly messagesService: MessagesService) {}
  
    @Post(':id')
    async sendMessage(
      @Param('id') id: number,
      @Body() dto: SendMessageDto,
      @Request() req
    ) {
      const res = await this.messagesService.sendMessageWithEmit({...dto, groupId: id, senderId: req.user.userId});
      return res;
    }

    @Post('/ai/:id')
    async sendMessageAi(
      @Param('id') id: number,
      @Body() dto: SendMessageDto,
      @Request() req
    ) {
      return this.messagesService.sendMessageAi({...dto, groupId: id, senderId: req.user.userId});
    }

    @Get(':id')
    async getLastMessages(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<any[]> {
      const messages = await this.messagesService.getMessagesForGroup(id, req.user.userId)
      return messages;
    }


    @Get('/ai/profile')
    async generateUserAiProfile(@Request() req): Promise<any> {
      const profile = await this.messagesService.generateUserAiProfile(req.user.userId);
      return profile;
    }

    @Get('/ai/:id')
    async getLastMessagesAi(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<any> {
      const messages = await this.messagesService.getMessagesForGroupAi(id, req.user.userId);
      return messages;
    }

    @Get('/ai/snippets/:id')
    async getSnippets(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<any> {
      return this.messagesService.getSnippets({groupId: id, senderId: req.user.userId});
    }


    @Get('/ai/:id/summary')
    async getSummaryMessages(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<any[]> {
      const messages = await this.messagesService.getSummaryMessagesForGroup(id, req.user.userId)
      return messages;
    }

    @Delete(':id')
    async deleteMessage(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<any> {
      const res = await this.messagesService.deleteMessageById(id, req.user.userId);
      return res;
    }
  
  }
  