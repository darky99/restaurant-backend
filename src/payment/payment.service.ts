import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async processPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }
    if (order.payment?.status === PaymentStatus.SUCCESS) {
      throw new ConflictException('Payment already completed');
    }

    const success = Math.random() < 0.85;
    const now = new Date();

    if (success) {
      const transactionId = `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      if (order.payment) {
        return this.prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            amount: order.total,
            transactionId,
            failureReason: null,
            processedAt: now,
          },
        });
      }
      return this.prisma.payment.create({
        data: {
          orderId,
          status: PaymentStatus.SUCCESS,
          amount: order.total,
          transactionId,
          processedAt: now,
        },
      });
    }

    const failureReason = Math.random() < 0.5 ? 'Card declined' : 'Insufficient funds';
    if (order.payment) {
      return this.prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.FAILED,
          amount: order.total,
          transactionId: null,
          failureReason,
          processedAt: now,
        },
      });
    }
    return this.prisma.payment.create({
      data: {
        orderId,
        status: PaymentStatus.FAILED,
        amount: order.total,
        failureReason,
        processedAt: now,
      },
    });
  }

  async getPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }
    return order.payment;
  }
}
