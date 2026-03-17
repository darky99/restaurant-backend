import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuQueryDto } from './dto/menu-query.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: MenuQueryDto) {
    const where: Prisma.MenuItemWhereInput = {
      isAvailable: true,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      where.categoryId = query.category;
    }
    if (query.dietary) {
      const tags = query.dietary.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length) {
        where.dietaryTags = { hasEvery: tags };
      }
    }
    if (query.minPrice != null || query.maxPrice != null) {
      where.basePrice = {};
      if (query.minPrice != null) {
        where.basePrice.gte = query.minPrice;
      }
      if (query.maxPrice != null) {
        where.basePrice.lte = query.maxPrice;
      }
    }
    return this.prisma.menuItem.findMany({
      where,
      include: { category: true, options: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  async findCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: true, options: true },
    });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async create(dto: CreateMenuItemDto) {
    const { options, ...rest } = dto;
    return this.prisma.menuItem.create({
      data: {
        ...rest,
        basePrice: rest.basePrice,
        options: options?.length
          ? {
              create: options.map((o) => ({
                groupName: o.groupName,
                optionName: o.optionName,
                priceModifier: o.priceModifier,
              })),
            }
          : undefined,
      },
      include: { category: true, options: true },
    });
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    await this.findOne(id);
    const { options, ...scalar } = dto;
    const data: Prisma.MenuItemUpdateInput = { ...scalar };
    if (scalar.basePrice != null) {
      data.basePrice = scalar.basePrice;
    }
    if (options !== undefined) {
      await this.prisma.menuItemOption.deleteMany({ where: { menuItemId: id } });
      if (options.length) {
        data.options = {
          create: options.map((o) => ({
            groupName: o.groupName,
            optionName: o.optionName,
            priceModifier: o.priceModifier,
          })),
        };
      }
    }
    return this.prisma.menuItem.update({
      where: { id },
      data,
      include: { category: true, options: true },
    });
  }

  async toggleAvailability(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
      include: { category: true, options: true },
    });
  }
}
