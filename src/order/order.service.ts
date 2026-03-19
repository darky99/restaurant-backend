import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type SelectedOpt = { groupName: string; optionName: string };

function parseSelectedOptions(raw: unknown): SelectedOpt[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(
      (x): x is SelectedOpt =>
        !!x &&
        typeof x === 'object' &&
        'groupName' in x &&
        'optionName' in x &&
        typeof (x as SelectedOpt).groupName === 'string' &&
        typeof (x as SelectedOpt).optionName === 'string',
    )
    .map((x) => ({ groupName: x.groupName, optionName: x.optionName }));
}

function computeUnitPrice(
  basePrice: Prisma.Decimal,
  options: { groupName: string; optionName: string; priceModifier: Prisma.Decimal }[],
  selected: SelectedOpt[],
): Prisma.Decimal {
  let total = new Prisma.Decimal(basePrice.toString());
  for (const sel of selected) {
    const opt = options.find(
      (o) => o.groupName === sel.groupName && o.optionName === sel.optionName,
    );
    if (!opt) {
      throw new BadRequestException(`Invalid option on cart line: ${sel.groupName}/${sel.optionName}`);
    }
    total = total.add(new Prisma.Decimal(opt.priceModifier.toString()));
  }
  return total;
}

function pricesMatch(a: Prisma.Decimal, b: Prisma.Decimal): boolean {
  return new Prisma.Decimal(a.toString()).equals(new Prisma.Decimal(b.toString()));
}

function generateOrderNumber(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === OrderStatus.CANCELLED) {
    return from !== OrderStatus.COMPLETED;
  }
  if (from === OrderStatus.RECEIVED && to === OrderStatus.PREPARING) {
    return true;
  }
  if (from === OrderStatus.PREPARING && to === OrderStatus.READY) {
    return true;
  }
  if (from === OrderStatus.READY && to === OrderStatus.COMPLETED) {
    return true;
  }
  return false;
}

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async placeOrder(userId: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { menuItem: { include: { options: true } } },
          },
        },
      });
      if (!cart?.items.length) {
        throw new BadRequestException('Cart is empty');
      }

      const priceMismatches: { cartItemId: string; menuItemId: string; expected: string; current: string }[] =
        [];

      for (const line of cart.items) {
        const mi = line.menuItem;
        if (!mi.isAvailable) {
          throw new ConflictException(`Item no longer available: ${mi.name}`);
        }
        if (mi.stockQuantity < line.quantity) {
          throw new ConflictException(`Insufficient stock for: ${mi.name}`);
        }
        const selected = parseSelectedOptions(line.selectedOptions);
        const expected = computeUnitPrice(mi.basePrice, mi.options, selected);
        if (!pricesMatch(line.unitPrice, expected)) {
          priceMismatches.push({
            cartItemId: line.id,
            menuItemId: mi.id,
            expected: expected.toFixed(2),
            current: new Prisma.Decimal(line.unitPrice.toString()).toFixed(2),
          });
        }
      }

      if (priceMismatches.length) {
        throw new ConflictException({
          message: 'Prices have changed; refresh your cart',
          mismatches: priceMismatches,
        });
      }

      for (const line of cart.items) {
        const res = await tx.menuItem.updateMany({
          where: {
            id: line.menuItemId,
            stockQuantity: { gte: line.quantity },
          },
          data: { stockQuantity: { decrement: line.quantity } },
        });
        if (res.count !== 1) {
          throw new ConflictException(`Stock changed for item: ${line.menuItem.name}`);
        }
      }

      let subtotal = new Prisma.Decimal(0);
      for (const line of cart.items) {
        const lineTotal = new Prisma.Decimal(line.unitPrice.toString()).mul(line.quantity);
        subtotal = subtotal.add(lineTotal);
      }
      const tax = subtotal.mul(new Prisma.Decimal('0.1'));
      const total = subtotal.add(tax);
      const orderNumber = generateOrderNumber();

      const created = await tx.order.create({
        data: {
          userId,
          orderNumber,
          status: OrderStatus.RECEIVED,
          subtotal,
          tax,
          total,
          items: {
            create: cart.items.map((line) => ({
              menuItemId: line.menuItemId,
              itemName: line.menuItem.name,
              quantity: line.quantity,
              selectedOptions: line.selectedOptions as Prisma.InputJsonValue,
              specialInstructions: line.specialInstructions,
              unitPrice: line.unitPrice,
              totalPrice: new Prisma.Decimal(line.unitPrice.toString()).mul(line.quantity),
            })),
          },
          statusLogs: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.RECEIVED,
            },
          },
        },
        include: {
          items: { include: { menuItem: true } },
          payment: true,
          statusLogs: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    this.events.emitNewOrder(order);
    return order;
  }

  async getOrders(userId: string, role: Role) {
    const where = role === Role.ADMIN ? {} : { userId };
    return this.prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: true } },
        payment: true,
      },
      orderBy: { placedAt: 'desc' },
    });
  }

  async getOrder(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
        statusLogs: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (role !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenException();
    }
    return order;
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const from = order.status;
    const to = dto.status;
    if (!canTransition(from, to)) {
      throw new ForbiddenException(`Invalid status transition ${from} -> ${to}`);
    }

    const data: Prisma.OrderUpdateInput = { status: to };
    const now = new Date();
    if (to === OrderStatus.PREPARING) {
      data.preparedAt = now;
    }
    if (to === OrderStatus.READY) {
      data.readyAt = now;
    }
    if (to === OrderStatus.COMPLETED) {
      data.completedAt = now;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...data,
        statusLogs: {
          create: {
            fromStatus: from,
            toStatus: to,
          },
        },
      },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
        statusLogs: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.events.emitOrderStatusUpdate(orderId, updated);
    return updated;
  }
}
