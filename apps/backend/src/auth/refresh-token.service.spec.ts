import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from '../prisma/prisma.service';

// Store en memoria que imita las operaciones de Prisma que usa el servicio, con el suficiente
// comportamiento para probar la rotación y la detección de reuso sin una base de datos real.
class FakeStore {
  rows: any[] = [];
  private seq = 0;

  create({ data }: any) {
    const row = {
      id: `rt-${++this.seq}`,
      revocadoEn: null,
      reemplazadoPorId: null,
      createdAt: new Date(),
      ...data,
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }
  findUnique({ where, include, select }: any) {
    const row = this.rows.find((r) => r.tokenHash === where.tokenHash);
    if (!row) return Promise.resolve(null);
    if (include?.usuario || select) {
      return Promise.resolve({ ...row, usuario: this.usuario });
    }
    return Promise.resolve(row);
  }
  update({ where, data }: any) {
    const row = this.rows.find((r) => r.id === where.id);
    Object.assign(row, data);
    return Promise.resolve(row);
  }
  updateMany({ where, data }: any) {
    let count = 0;
    for (const r of this.rows) {
      if (r.familiaId === where.familiaId && r.revocadoEn === null) {
        Object.assign(r, data);
        count++;
      }
    }
    return Promise.resolve({ count });
  }
  usuario = { id: 'user-1', activo: true };
}

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let store: FakeStore;

  beforeEach(async () => {
    store = new FakeStore();
    const prismaMock = {
      refreshToken: {
        create: (a: any) => store.create(a),
        findUnique: (a: any) => store.findUnique(a),
        update: (a: any) => store.update(a),
        updateMany: (a: any) => store.updateMany(a),
      },
      $transaction: (fn: any) =>
        fn({
          refreshToken: {
            create: (a: any) => store.create(a),
            update: (a: any) => store.update(a),
          },
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: () => '30' } },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it('emite un token opaco y persiste solo su hash, nunca el valor en claro', async () => {
    const token = await service.emitir('user-1');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].tokenHash).not.toBe(token);
    expect(store.rows.some((r) => r.tokenHash === token)).toBe(false);
  });

  it('rota: el token presentado queda revocado y encadenado al sucesor', async () => {
    const t1 = await service.emitir('user-1');
    const { token: t2 } = await service.rotar(t1);

    expect(t2).not.toBe(t1);
    const viejo = store.rows[0];
    expect(viejo.revocadoEn).not.toBeNull();
    expect(viejo.reemplazadoPorId).toBe(store.rows[1].id);
    expect(store.rows[1].familiaId).toBe(viejo.familiaId);
  });

  it('detecta reuso de un token ya rotado y revoca la familia completa', async () => {
    const t1 = await service.emitir('user-1');
    await service.rotar(t1); // t1 queda revocado

    await expect(service.rotar(t1)).rejects.toThrow(UnauthorizedException);
    // Ni el token viejo ni su sucesor siguen vivos.
    expect(store.rows.every((r) => r.revocadoEn !== null)).toBe(true);
  });

  it('rechaza un token inexistente', async () => {
    await expect(service.rotar('deadbeef')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token de un usuario inactivo y revoca su familia', async () => {
    const t1 = await service.emitir('user-1');
    store.usuario.activo = false;

    await expect(service.rotar(t1)).rejects.toThrow(UnauthorizedException);
    expect(store.rows[0].revocadoEn).not.toBeNull();
  });

  it('revocarPorToken revoca la familia y no falla ante un token desconocido', async () => {
    const t1 = await service.emitir('user-1');
    await service.revocarPorToken(t1);
    expect(store.rows[0].revocadoEn).not.toBeNull();

    await expect(service.revocarPorToken('noexiste')).resolves.toBeUndefined();
  });
});
