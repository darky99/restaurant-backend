import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      } as unknown as PrismaService['user'],
    };
    jwt = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates user and returns access_token and user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const created = {
        id: 'user-1',
        name: 'Jane',
        email: 'jane@example.com',
        role: 'CUSTOMER' as const,
      };
      prisma.user.create.mockResolvedValue(created as never);
      jwt.signAsync.mockResolvedValue('signed-jwt');

      const result = await service.register({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'password123',
      });

      expect(result.access_token).toBe('signed-jwt');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Jane',
        email: 'jane@example.com',
        role: 'CUSTOMER',
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Jane',
          email: 'jane@example.com',
          passwordHash: expect.any(String),
          cart: { create: {} },
        }),
        select: { id: true, name: true, email: true, role: true },
      });
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: 'CUSTOMER',
      });
    });

    it('throws ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'x' } as never);

      await expect(
        service.register({
          name: 'Jane',
          email: 'taken@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns access_token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-pass', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Bob',
        email: 'bob@example.com',
        role: 'CUSTOMER',
        passwordHash,
      } as never);
      jwt.signAsync.mockResolvedValue('login-jwt');

      const result = await service.login({
        email: 'bob@example.com',
        password: 'correct-pass',
      });

      expect(result).toEqual({
        access_token: 'login-jwt',
        user: {
          id: 'u1',
          name: 'Bob',
          email: 'bob@example.com',
          role: 'CUSTOMER',
        },
      });
    });

    it('throws UnauthorizedException for invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: await bcrypt.hash('other', 8),
      } as never);

      await expect(
        service.login({ email: 'bob@example.com', password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
