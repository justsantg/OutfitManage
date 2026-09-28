import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { PrismaService } from '../prisma/prisma.service';
import { MovimientoTipoDto } from './dto/create-movimiento.dto';

describe('InventarioService.createMovimiento', () => {
  let service: InventarioService;
  let prisma: any;

  const VARIANTE = { id: 'var-1' };
  const UBICACION_ORIGEN = { id: 'ubi-1' };
  const UBICACION_DESTINO = { id: 'ubi-2' };

  const baseDto = {
    varianteId: VARIANTE.id,
    ubicacionId: UBICACION_ORIGEN.id,
    tipo: MovimientoTipoDto.ENTRADA,
    cantidad: 10,
  };

  beforeEach(async () => {
    prisma = {
      varianteSku: { findUnique: jest.fn().mockResolvedValue(VARIANTE) },
      ubicacion: {
        findUnique: jest.fn((args: any) =>
          Promise.resolve(
            args.where.id === UBICACION_DESTINO.id
              ? UBICACION_DESTINO
              : UBICACION_ORIGEN,
          ),
        ),
      },
      movimientoInventario: {
        // Se usa para dos consultas distintas: la deduplicación por idempotencyKey (debe dar
        // null salvo que un test la sobreescriba) y la relectura post-transacción por id (debe
        // devolver el movimiento recién creado, con sus relaciones incluidas).
        findUnique: jest.fn().mockImplementation((args: any) => {
          if (args.where?.id) {
            return Promise.resolve({
              id: args.where.id,
              varianteId: VARIANTE.id,
              ...args.where,
            });
          }
          return Promise.resolve(null);
        }),
        create: jest
          .fn()
          .mockImplementation((args: any) =>
            Promise.resolve({ id: 'mov-1', ...args.data }),
          ),
      },
      saldoInventario: {
        findUnique: jest.fn().mockResolvedValue({ cantidad: 100 }),
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: any) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
  });

  it('rechaza sin Idempotency-Key (obligatoria — copilot-instructions.md)', async () => {
    await expect(
      service.createMovimiento(baseDto, 'user-1', ''),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza TRASLADO sin ubicacionDestinoId', async () => {
    await expect(
      service.createMovimiento(
        { ...baseDto, tipo: MovimientoTipoDto.TRASLADO },
        'user-1',
        'key-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([MovimientoTipoDto.AJUSTE, MovimientoTipoDto.DEVOLUCION])(
    'rechaza %s sin motivo',
    async (tipo) => {
      await expect(
        service.createMovimiento(
          { ...baseDto, tipo, cantidad: 1 },
          'user-1',
          'key-1',
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('deduplica por Idempotency-Key cuando el payload es idéntico (ADR-004)', async () => {
    prisma.movimientoInventario.findUnique.mockResolvedValue({
      id: 'mov-existente',
      varianteId: baseDto.varianteId,
      ubicacionId: baseDto.ubicacionId,
      ubicacionDestinoId: null,
      tipo: 'ENTRADA',
      cantidad: baseDto.cantidad,
    });

    const result = await service.createMovimiento(
      baseDto,
      'user-1',
      'key-repetida',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
    expect(result.movimiento).toBeDefined();
  });

  it('rechaza con 409 cuando la misma Idempotency-Key trae un payload distinto', async () => {
    prisma.movimientoInventario.findUnique.mockResolvedValue({
      id: 'mov-existente',
      varianteId: baseDto.varianteId,
      ubicacionId: baseDto.ubicacionId,
      ubicacionDestinoId: null,
      tipo: 'ENTRADA',
      cantidad: 999, // cantidad distinta a la del nuevo request
    });

    await expect(
      service.createMovimiento(baseDto, 'user-1', 'key-repetida'),
    ).rejects.toThrow(ConflictException);
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('rechaza SALIDA con stock insuficiente (422 insufficient_stock)', async () => {
    prisma.saldoInventario.findUnique.mockResolvedValue({ cantidad: 3 });

    await expect(
      service.createMovimiento(
        { ...baseDto, tipo: MovimientoTipoDto.SALIDA, cantidad: 10 },
        'user-1',
        'key-1',
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('registra ENTRADA e incrementa el saldo de la ubicación de origen', async () => {
    await service.createMovimiento(baseDto, 'user-1', 'key-1');

    expect(prisma.movimientoInventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: 'user-1',
          cantidad: 10,
          tipo: 'ENTRADA',
        }),
      }),
    );
    expect(prisma.saldoInventario.upsert).toHaveBeenCalledTimes(1);
    const [[upsertArgs]] = prisma.saldoInventario.upsert.mock.calls;
    expect(upsertArgs.update.cantidad.increment).toBe(10);
  });

  it('en TRASLADO decrementa el origen e incrementa el destino', async () => {
    await service.createMovimiento(
      {
        ...baseDto,
        tipo: MovimientoTipoDto.TRASLADO,
        ubicacionDestinoId: UBICACION_DESTINO.id,
        cantidad: 5,
      },
      'user-1',
      'key-1',
    );

    expect(prisma.saldoInventario.upsert).toHaveBeenCalledTimes(2);
    const [origenCall, destinoCall] =
      prisma.saldoInventario.upsert.mock.calls.map((c: any) => c[0]);
    expect(origenCall.update.cantidad.increment).toBe(-5);
    expect(destinoCall.update.cantidad.increment).toBe(5);
  });
});

describe('InventarioService.procesarBatch', () => {
  let service: InventarioService;
  let prisma: any;
  let creados: Set<string>;

  const okDto = {
    varianteId: 'var-1',
    ubicacionId: 'ubi-1',
    tipo: MovimientoTipoDto.ENTRADA,
    cantidad: 5,
  };

  beforeEach(async () => {
    creados = new Set();
    prisma = {
      varianteSku: { findUnique: jest.fn().mockResolvedValue({ id: 'var-1' }) },
      ubicacion: { findUnique: jest.fn().mockResolvedValue({ id: 'ubi-1' }) },
      movimientoInventario: {
        // Deduplica por idempotencyKey contra las keys ya "creadas" en este test.
        findUnique: jest.fn().mockImplementation((args: any) => {
          if (args.where?.id) return Promise.resolve({ id: args.where.id });
          const k = args.where?.idempotencyKey as string | undefined;
          if (k && creados.has(k)) {
            return Promise.resolve({
              id: 'mov-' + k,
              idempotencyKey: k,
              varianteId: okDto.varianteId,
              ubicacionId: okDto.ubicacionId,
              ubicacionDestinoId: null,
              tipo: 'ENTRADA',
              cantidad: okDto.cantidad,
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation((args: any) => {
          creados.add(args.data.idempotencyKey as string);
          return Promise.resolve({
            id: 'mov-' + args.data.idempotencyKey,
            ...args.data,
          });
        }),
      },
      saldoInventario: {
        findUnique: jest.fn().mockResolvedValue({ cantidad: 100 }),
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<InventarioService>(InventarioService);
  });

  const admin = { id: 'u1', rol: 'ADMIN' };

  it('procesa cada operación y reporta processed por operación', async () => {
    const { resultados } = await service.procesarBatch(
      [
        { idempotencyKey: 'k1', payload: { ...okDto } },
        { idempotencyKey: 'k2', payload: { ...okDto } },
      ],
      admin,
    );
    expect(resultados).toEqual([
      { idempotencyKey: 'k1', status: 'processed' },
      { idempotencyKey: 'k2', status: 'processed' },
    ]);
  });

  it('reenviar el mismo lote no duplica: la segunda vez todo es duplicate (RF-007)', async () => {
    const lote = [
      { idempotencyKey: 'k1', payload: { ...okDto } },
      { idempotencyKey: 'k2', payload: { ...okDto } },
    ];
    await service.procesarBatch(lote, admin);
    const createCalls = prisma.movimientoInventario.create.mock.calls.length;

    const { resultados } = await service.procesarBatch(lote, admin);
    expect(resultados.map((r) => r.status)).toEqual(['duplicate', 'duplicate']);
    // No hubo nuevas inserciones en el segundo envío.
    expect(prisma.movimientoInventario.create.mock.calls.length).toBe(
      createCalls,
    );
  });

  it('una operación inválida no aborta el resto (no es todo-o-nada, FA-02)', async () => {
    const { resultados } = await service.procesarBatch(
      [
        { idempotencyKey: 'ok', payload: { ...okDto } },
        // SALIDA no permitida para BODEGA... pero aquí el rol es ADMIN; forzamos error por tipo
        // desconocido en el payload para ejercitar la rama de error sin frenar el lote.
        {
          idempotencyKey: 'bad',
          payload: { ...okDto, tipo: 'NOEXISTE' as any },
        },
        { idempotencyKey: 'ok2', payload: { ...okDto } },
      ],
      admin,
    );
    expect(resultados[0].status).toBe('processed');
    expect(resultados[1].status).toBe('error');
    expect(resultados[2].status).toBe('processed');
  });

  it('deniega por rol la operación cuyo tipo no le corresponde, sin tocar el ledger', async () => {
    const bodega = { id: 'u2', rol: 'BODEGA' };
    const { resultados } = await service.procesarBatch(
      [
        {
          idempotencyKey: 'k1',
          payload: { ...okDto, tipo: MovimientoTipoDto.SALIDA },
        },
      ],
      bodega,
    );
    expect(resultados[0].status).toBe('error');
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
  });
});

describe('InventarioService.cambioTalla', () => {
  let service: InventarioService;
  let prisma: any;
  let saldos: Record<string, number>;

  beforeEach(async () => {
    saldos = { 'vNueva|ubi': 3, 'vDev|ubi': 0 };
    const key = (varId: string, ubi: string) => `${varId}|${ubi}`;
    prisma = {
      varianteSku: { findUnique: jest.fn().mockResolvedValue({ id: 'x' }) },
      ubicacion: { findUnique: jest.fn().mockResolvedValue({ id: 'ubi' }) },
      movimientoInventario: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((a: any) =>
            Promise.resolve({ id: 'm-' + a.data.tipo, ...a.data }),
          ),
      },
      saldoInventario: {
        findUnique: jest.fn().mockImplementation((a: any) => {
          const w = a.where.varianteId_ubicacionId as {
            varianteId: string;
            ubicacionId: string;
          };
          const k = key(w.varianteId, w.ubicacionId);
          return Promise.resolve(
            saldos[k] !== undefined ? { cantidad: saldos[k] } : null,
          );
        }),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<InventarioService>(InventarioService);
  });

  const dto = {
    varianteDevueltaId: 'vDev',
    varianteNuevaId: 'vNueva',
    ubicacionId: 'ubi',
    cantidad: 1,
    motivo: 'Cambio M a L',
  };

  it('crea DEVOLUCION y SALIDA ligadas por movimientoReferenciaId', async () => {
    await service.cambioTalla(dto, 'user-1', 'key-1');
    const calls = prisma.movimientoInventario.create.mock.calls.map(
      (c: any) => c[0].data,
    );
    const dev = calls.find((d: any) => d.tipo === 'DEVOLUCION');
    const sal = calls.find((d: any) => d.tipo === 'SALIDA');
    expect(dev).toBeDefined();
    expect(sal).toBeDefined();
    expect(sal.movimientoReferenciaId).toBe('m-DEVOLUCION');
  });

  it('rechaza si no hay stock de la talla nueva, sin persistir la devolución', async () => {
    saldos['vNueva|ubi'] = 0;
    await expect(service.cambioTalla(dto, 'user-1', 'key-2')).rejects.toThrow();
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('rechaza si la variante devuelta y la nueva son la misma', async () => {
    await expect(
      service.cambioTalla(
        { ...dto, varianteNuevaId: 'vDev' },
        'user-1',
        'key-3',
      ),
    ).rejects.toThrow();
  });

  it('es idempotente: repetir con la misma key no crea movimientos nuevos', async () => {
    prisma.movimientoInventario.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'ya', idempotencyKey: 'key-1:devolucion' });
    await service.cambioTalla(dto, 'user-1', 'key-1');
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
  });
});

describe('InventarioService — consultas de lectura', () => {
  let service: InventarioService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      varianteSku: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'v1',
          skuCode: 'SKU-1',
          talla: 'M',
          color: 'Azul',
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'v1',
            skuCode: 'SKU-1',
            talla: 'M',
            color: 'Azul',
            producto: { id: 'p1', nombre: 'Camiseta' },
            saldos: [
              {
                cantidad: 4,
                ubicacion: { id: 'u1', nombre: 'Bodega', tipo: 'BODEGA' },
              },
            ],
          },
        ]),
        count: jest.fn().mockResolvedValue(3),
      },
      saldoInventario: {
        findMany: jest.fn().mockResolvedValue([
          {
            varianteId: 'v1',
            ubicacionId: 'u1',
            cantidad: 4,
            ubicacion: { id: 'u1', nombre: 'Bodega', tipo: 'BODEGA' },
          },
        ]),
      },
      movimientoInventario: {
        findMany: jest.fn().mockResolvedValue([{ id: 'm1', tipo: 'ENTRADA' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      producto: { count: jest.fn().mockResolvedValue(2) },
      ubicacion: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'u1', nombre: 'Bodega', tipo: 'BODEGA' }]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<InventarioService>(InventarioService);
  });

  it('getStock exige varianteId o sku', async () => {
    await expect(service.getStock({})).rejects.toThrow(BadRequestException);
  });

  it('getStock devuelve saldos por ubicación y total', async () => {
    const res: any = await service.getStock({ sku: 'SKU-1' });
    expect(res.total).toBe(4);
    expect(res.saldos).toHaveLength(1);
  });

  it('getStock lanza 404 si la variante no existe', async () => {
    prisma.varianteSku.findFirst.mockResolvedValueOnce(null);
    await expect(service.getStock({ sku: 'NADA' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getMovimientos acota el límite superior y pagina', async () => {
    const res: any = await service.getMovimientos(1, 9999, 'ENTRADA');
    expect(res.meta.limit).toBeLessThanOrEqual(100);
    expect(res.meta.total).toBe(1);
  });

  it('buscarStockRapido resume el stock por variante', async () => {
    const res: any = await service.buscarStockRapido('polo', 'cat-1');
    expect(res[0].stockTotal).toBe(4);
    expect(res[0].desglose).toHaveLength(1);
  });

  it('getDashboardStats consolida totales y desglose por ubicación', async () => {
    const res: any = await service.getDashboardStats();
    expect(res.totalProductos).toBe(2);
    expect(res.stockTotal).toBe(4);
    expect(res.resumenPorUbicacion[0].stock).toBe(4);
  });
});
