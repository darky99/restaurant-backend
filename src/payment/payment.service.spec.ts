import { NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  const mockPrisma = {
    order: { findUnique: jest.fn() },
    payment: { create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(PaymentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processPayment', () => {
    it('creates payment record', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const total = new Prisma.Decimal('99.00');
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        total,
        payment: null,
      } as never);

      const created = {
        id: 'pay-new',
        orderId: 'order-1',
        status: PaymentStatus.SUCCESS,
      };
      mockPrisma.payment.create.mockResolvedValue(created as never);

      const result = await service.processPayment('order-1', 'user-1');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          status: PaymentStatus.SUCCESS,
          amount: total,
          transactionId: expect.stringMatching(/^txn_/),
          processedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('updates existing payment instead of creating another', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const total = new Prisma.Decimal('50.00');
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        total,
        payment: { id: 'pay-existing', status: PaymentStatus.PENDING },
      } as never);

      const updated = { id: 'pay-existing', status: PaymentStatus.SUCCESS };
      mockPrisma.payment.update.mockResolvedValue(updated as never);

      const result = await service.processPayment('order-1', 'user-1');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-existing' },
        data: expect.objectContaining({
          status: PaymentStatus.SUCCESS,
          amount: total,
          failureReason: null,
          processedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(result).toBe(updated);
    });

    it('throws NotFoundException for invalid orderId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.processPayment('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
