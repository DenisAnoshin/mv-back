import {
    Controller,
 
    UseGuards,
    Post,
    Body,
    Request,
    Get,
    Param,
    ParseIntPipe
  } from '@nestjs/common';
  import { MessagesService } from './messages.service';
  import { AuthGuard } from '@nestjs/passport';
import { SendMessageDto } from 'src/common/dto/send-message.dto';
import { Message } from './messages.entity';
  
  @UseGuards(AuthGuard('jwt'))
  @Controller('messages')
  export class MessagesController {
    constructor(private readonly messagesService: MessagesService) {}
  
    @Post(':id')
    sendMessageAi(
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


    @Get('/ai/:id')
    async getLastMessagesAi(
      @Param('id', ParseIntPipe) id: number,
      @Request() req: any
    ): Promise<any> {
      const messages = await this.messagesService.getMessagesForGroupAi(id, req.user.userId);
      return messages;
    }
  
  }
  