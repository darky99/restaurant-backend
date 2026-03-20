import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private payments: PaymentService) {}

  @Post()
  process(@CurrentUser() user: AuthUser, @Body() dto: ProcessPaymentDto) {
    return this.payments.processPayment(dto.orderId, user.id);
  }

  @Get(':orderId')
  getOne(@CurrentUser() user: AuthUser, @Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.payments.getPayment(orderId, user.id);
  }
}
