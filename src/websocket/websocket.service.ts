import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class WebsocketService {
  private _server: Server;
  private getClientById: ((userId: number) => Socket | undefined) | null = null;

  // Устанавливаем сервер
  setServer(server: Server) {
    this._server = server;
  }

  // (Необязательно) установить функцию для получения клиента по id
  setClientGetter(getClientFn: (userId: number) => Socket | undefined) {
    this.getClientById = getClientFn;
  }

  // Получить сокет-клиента по userId
  getClient(userId: number): Socket | undefined {
    return this.getClientById ? this.getClientById(userId) : undefined;
  }

  

  // Отправить событие всем в комнате (группе)
  emitToRoom(room: string, event: string, payload: any) {
    if (this._server) {
      this._server.to(room).emit(event, payload);
    }
  }

  // Отправить событие всем в комнате кроме одного пользователя (например, кроме отправителя)
  emitToRoomExceptUser(room: string, event: string, payload: any, exceptUserId: number) {
    if (!this._server) return;
    const exceptClient = this.getClient(exceptUserId);
    if (exceptClient) {
      exceptClient.to(room).emit(event, payload); // отправляет всем в комнате, кроме exceptClient
    } else {
      // Если клиент не подключён — fallback: просто всем
      this._server.to(room).emit(event, payload);
    }
  }


  // Отправить событие всем пользователям
  emitToAll(event: string, payload: any) {
    if (this._server) {
      this._server.emit(event, payload);
    }
  }

  // Отправить событие одному пользователю
  emitToUser(userId: number, event: string, payload: any) {
    const client = this.getClient(userId);
    if (client) {
      client.emit(event, payload);
    }
  }

  // Подписать пользователя на комнату
  subscribeUserToGroup(userId: number, groupId: number) {
    const client = this.getClient(userId);
    if (client) {
      client.join(`group_${groupId}`);
      
    }
  }
}
