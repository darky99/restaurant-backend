import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;
  let prisma: jest.Mocked<Pick<PrismaService, 'menuItem' | 'category'>>;

  beforeEach(async () => {
    prisma = {
      menuItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      } as unknown as PrismaService['menuItem'],
      category: {} as PrismaService['category'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MenuService);
  });

  describe('findAll', () => {
    it('returns all items', async () => {
      const items = [{ id: '1', name: 'A' }];
      prisma.menuItem.findMany.mockResolvedValue(items as never);

      const result = await service.findAll({});

      expect(result).toBe(items);
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isAvailable: true }),
        }),
      );
    });

    it('applies search filter', async () => {
      prisma.menuItem.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'pizza' });

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'pizza', mode: 'insensitive' } },
              { description: { contains: 'pizza', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('applies category filter', async () => {
      const categoryId = '550e8400-e29b-41d4-a716-446655440000';
      prisma.menuItem.findMany.mockResolvedValue([]);

      await service.findAll({ category: categoryId });

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns item with options', async () => {
      const item = {
        id: 'm1',
        name: 'Burger',
        category: { id: 'c1' },
        options: [{ id: 'o1' }],
      };
      prisma.menuItem.findUnique.mockResolvedValue(item as never);

      const result = await service.findOne('m1');

      expect(result).toEqual(item);
      expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        include: { category: true, options: true },
      });
    });

    it('throws NotFoundException for non-existent id', async () => {
      prisma.menuItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
