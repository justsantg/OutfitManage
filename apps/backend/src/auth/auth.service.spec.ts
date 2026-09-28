import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    usuario: {
      findUnique: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        // Por defecto simula una instalación con usuarios existentes (no es el primer arranque);
        // los tests del caso especial de bootstrap lo sobreescriben explícitamente a 0.
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('15m') },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            emitir: jest.fn().mockResolvedValue('refresh-token-emitido'),
            rotar: jest.fn(),
            revocarPorToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('crea siempre un usuario con rol CLIENTE, sin importar lo que traiga el DTO', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.usuario.create.mockResolvedValue({
        id: 'u1',
        nombre: 'Test',
        email: 'test@test.com',
        rol: Rol.CLIENTE,
      });

      // El DTO real ya no expone `rol`, pero si algo intentara colarlo por fuera del tipado
      // (payload crudo, cliente desactualizado), el servicio nunca debe leerlo.
      await service.register({
        nombre: 'Test',
        email: 'test@test.com',
        password: 'password123',
        // @ts-expect-error — verifica que un campo `rol` inyectado fuera del DTO se ignora
        rol: 'ADMIN',
      });

      expect(prisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rol: Rol.CLIENTE }),
        }),
      );
    });

    it('asigna ADMIN automáticamente solo cuando la base de datos no tiene ningún usuario (bootstrap)', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.usuario.count.mockResolvedValue(0);
      prisma.usuario.create.mockResolvedValue({
        id: 'u1',
        nombre: 'Primer Usuario',
        email: 'primero@test.com',
        rol: Rol.ADMIN,
      });

      await service.register({
        nombre: 'Primer Usuario',
        email: 'primero@test.com',
        password: 'password123',
      });

      expect(prisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rol: Rol.ADMIN }),
        }),
      );
    });

    it('rechaza un correo ya registrado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          nombre: 'Test',
          email: 'test@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('nunca autentica por comparación en texto plano, aunque la password coincida literalmente con el hash almacenado', async () => {
      // Simula una fila sembrada o migrada con un "hash" que en realidad es la password en claro
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'legacy@test.com',
        passwordHash: 'password123',
        activo: true,
        rol: Rol.CLIENTE,
      });

      await expect(
        service.login({ email: 'legacy@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('autentica correctamente con un hash bcrypt válido', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: hash,
        activo: true,
        rol: Rol.CLIENTE,
        nombre: 'User',
      });

      const result = await service.login({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('responde igual (401) ante usuario inexistente que ante password incorrecta — anti-enumeración', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);
      const noExisteError = await service
        .login({ email: 'nadie@test.com', password: 'cualquiera1' })
        .catch((e) => e);

      const hash = await bcrypt.hash('correcta123', 10);
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: hash,
        activo: true,
        rol: Rol.CLIENTE,
      });
      const passwordMalaError = await service
        .login({ email: 'user@test.com', password: 'incorrecta1' })
        .catch((e) => e);

      expect(noExisteError).toBeInstanceOf(UnauthorizedException);
      expect(passwordMalaError).toBeInstanceOf(UnauthorizedException);
      expect(noExisteError.message).toBe(passwordMalaError.message);
    });

    it('rechaza a un usuario inactivo aunque la password sea correcta', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: hash,
        activo: false,
        rol: Rol.CLIENTE,
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
