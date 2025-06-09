import { forwardRef, Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { MessagesModule } from 'src/messages/messages.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => MessagesModule),
    AuthModule,
  ],
  providers: [
    WebsocketGateway,
    
    WebsocketService,
  ],
  exports: [WebsocketGateway, WebsocketService],
})
export class WebsocketModule {}
