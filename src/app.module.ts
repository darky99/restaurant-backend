import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { EventsModule } from './websocket/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    AuthModule,
    MenuModule,
    CartModule,
    OrderModule,
    PaymentModule,
  ],
})
export class AppModule {}
