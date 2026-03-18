import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MenuItem, MenuItemOption, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

export type SelectedOpt = { groupName: string; optionName: string };

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

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private computeUnitPrice(
    menuItem: MenuItem & { options: MenuItemOption[] },
    selected: SelectedOpt[],
  ): Prisma.Decimal {
    let total = new Prisma.Decimal(menuItem.basePrice.toString());
    for (const sel of selected) {
      const opt = menuItem.options.find(
        (o) => o.groupName === sel.groupName && o.optionName === sel.optionName,
      );
      if (!opt) {
        throw new BadRequestException(
          `Invalid option: ${sel.groupName} / ${sel.optionName}`,
        );
      }
      total = total.add(new Prisma.Decimal(opt.priceModifier.toString()));
    }
    return total;
  }

  private async getOrCreateCartId(userId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart.id;
  }

  async getCart(userId: string) {
    const cartId = await this.getOrCreateCartId(userId);
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { menuItem: { include: { options: true, category: true } } },
        },
      },
    });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      include: { options: true },
    });
    if (!menuItem || !menuItem.isAvailable) {
      throw new NotFoundException('Menu item not available');
    }
    const selected = dto.selectedOptions ?? [];
    const unitPrice = this.computeUnitPrice(menuItem, selected);
    const cartId = await this.getOrCreateCartId(userId);
    const qty = dto.quantity ?? 1;
    await this.prisma.cartItem.create({
      data: {
        cartId,
        menuItemId: menuItem.id,
        quantity: qty,
        selectedOptions: selected as unknown as Prisma.InputJsonValue,
        specialInstructions: dto.specialInstructions ?? null,
        unitPrice,
      },
    });
    return this.getCart(userId);
  }

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const cartId = await this.getOrCreateCartId(userId);
    const line = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId },
      include: { menuItem: { include: { options: true } } },
    });
    if (!line) {
      throw new NotFoundException('Cart item not found');
    }
    const selected =
      dto.selectedOptions !== undefined
        ? dto.selectedOptions
        : parseSelectedOptions(line.selectedOptions);
    const unitPrice = this.computeUnitPrice(line.menuItem, selected);
    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity: dto.quantity ?? line.quantity,
        selectedOptions: (dto.selectedOptions ?? selected) as unknown as Prisma.InputJsonValue,
        specialInstructions:
          dto.specialInstructions !== undefined ? dto.specialInstructions : line.specialInstructions,
        unitPrice,
      },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const cartId = await this.getOrCreateCartId(userId);
    const line = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId },
    });
    if (!line) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  async clearCart(userId: string) {
    const cartId = await this.getOrCreateCartId(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }
}
