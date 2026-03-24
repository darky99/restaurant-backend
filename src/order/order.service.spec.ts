import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: {
    $transaction: jest.Mock;
    order: { findUnique: jest.Mock; update: jest.Mock };
  };
  let events: { emitNewOrder: jest.Mock; emitOrderStatusUpdate: jest.Mock };

  beforeEach(async () => {
    events = {
      emitNewOrder: jest.fn(),
      emitOrderStatusUpdate: jest.fn(),
    };
    prisma = {
      $transaction: jest.fn(),
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: events },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  function mockCart(overrides?: {
    items?: unknown[];
    empty?: boolean;
    unavailable?: boolean;
  }) {
    const basePrice = new Prisma.Decimal('12.00');
    const unitPrice = new Prisma.Decimal('12.00');
    if (overrides?.empty) {
      return {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      };
    }
    if (overrides?.unavailable) {
      return {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'line-1',
            menuItemId: 'mi-1',
            quantity: 1,
            unitPrice,
            selectedOptions: [],
            specialInstructions: null,
            menuItem: {
              id: 'mi-1',
              name: 'Soup',
              isAvailable: false,
              stockQuantity: 5,
              basePrice,
              options: [],
            },
          },
        ],
      };
    }
    return {
      id: 'cart-1',
      userId: 'user-1',
      items: [
        {
          id: 'line-1',
          menuItemId: 'mi-1',
          quantity: 2,
          unitPrice,
          selectedOptions: [],
          specialInstructions: null,
          menuItem: {
            id: 'mi-1',
            name: 'Pasta',
            isAvailable: true,
            stockQuantity: 10,
            basePrice,
            options: [],
          },
        },
      ],
    };
  }

  describe('placeOrder', () => {
    it('creates order, deducts stock, clears cart', async () => {
      const cart = mockCart();
      const createdOrder = {
        id: 'ord-1',
        orderNumber: 'ORD-X',
        items: [],
        payment: null,
        statusLogs: [],
        user: {},
      };

      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue(cart) },
        menuItem: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        order: { create: jest.fn().mockResolvedValue(createdOrder) },
        cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      };

      prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      );

      const result = await service.placeOrder('user-1');

      expect(result).toBe(createdOrder);
      expect(tx.menuItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'mi-1', stockQuantity: { gte: 2 } },
        data: { stockQuantity: { decrement: 2 } },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(events.emitNewOrder).toHaveBeenCalledWith(createdOrder);
    });

    it('throws on empty cart', async () => {
      const cart = mockCart({ empty: true });
      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue(cart) },
        menuItem: { updateMany: jest.fn() },
        order: { create: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      );

      await expect(service.placeOrder('user-1')).rejects.toThrow(BadRequestException);
      expect(tx.menuItem.updateMany).not.toHaveBeenCalled();
      expect(events.emitNewOrder).not.toHaveBeenCalled();
    });

    it('throws on unavailable items', async () => {
      const cart = mockCart({ unavailable: true });
      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue(cart) },
        menuItem: { updateMany: jest.fn() },
        order: { create: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      );

      await expect(service.placeOrder('user-1')).rejects.toThrow(ConflictException);
      expect(events.emitNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('allows RECEIVED -> PREPARING', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: OrderStatus.RECEIVED,
      });
      const updated = {
        id: 'o1',
        status: OrderStatus.PREPARING,
        items: [],
        payment: null,
        statusLogs: [],
        user: {},
      };
      prisma.order.update.mockResolvedValue(updated);

      const result = await service.updateStatus('o1', { status: OrderStatus.PREPARING });

      expect(result.status).toBe(OrderStatus.PREPARING);
      expect(events.emitOrderStatusUpdate).toHaveBeenCalledWith('o1', updated);
    });

    it('rejects READY -> RECEIVED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: OrderStatus.READY,
      });

      await expect(
        service.updateStatus('o1', { status: OrderStatus.RECEIVED }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
