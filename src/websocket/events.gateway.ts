import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/orders' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    void client;
  }

  handleDisconnect(client: Socket) {
    void client;
  }

  @SubscribeMessage('order:subscribe')
  handleOrderSubscribe(client: Socket, payload: { orderId: string }) {
    if (payload?.orderId) {
      void client.join(`order:${payload.orderId}`);
    }
  }

  @SubscribeMessage('kitchen:subscribe')
  handleKitchenSubscribe(client: Socket) {
    void client.join('kitchen');
  }

  emitOrderStatusUpdate(orderId: string, order: unknown) {
    this.server.to(`order:${orderId}`).emit('order:status_updated', order);
  }

  emitNewOrder(order: unknown) {
    this.server.to('kitchen').emit('order:new', order);
  }
}
