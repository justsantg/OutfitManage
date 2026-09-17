import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { MovimientoTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMovimientoDto,
  MovimientoTipoDto,
} from './dto/create-movimiento.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import { CambioTallaDto } from './dto/cambio-talla.dto';
import { puedeRegistrarMovimiento } from '../common/rbac/movimiento-permisos';

export interface BatchOperacion {
  idempotencyKey: string;
  payload: CreateMovimientoDto;
}
export interface BatchResultado {
  idempotencyKey: string;
  status: 'processed' | 'duplicate' | 'error';
  detalle?: string;
}

// SALIDA y TRASLADO siempre restan del saldo de origen (ADR-003). AJUSTE puede ir en cualquier
// dirección según el conteo físico: por defecto resta (faltante), o suma si `ajusteIncrementa`
// es true (sobrante). ENTRADA y DEVOLUCION siempre suman.
const TIPOS_QUE_DECREMENTAN_SIEMPRE: MovimientoTipoDto[] = [
  MovimientoTipoDto.SALIDA,
  MovimientoTipoDto.TRASLADO,
];

function decrementaOrigen(dto: {
  tipo: MovimientoTipoDto;
  ajusteIncrementa?: boolean;
}): boolean {
  if (dto.tipo === MovimientoTipoDto.AJUSTE) {
    return !dto.ajusteIncrementa;
  }
  return TIPOS_QUE_DECREMENTAN_SIEMPRE.includes(dto.tipo);
}

const MAX_LIMIT = 100;

// Ver la misma nota en productos.service.ts: el timeout por defecto de Prisma (5s) es
// insuficiente contra una base de datos remota con latencia de red real.
const TRANSACTION_OPTIONS = { timeout: 20000 };

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra un movimiento de inventario en el ledger inmutable y recalcula el saldo
   * materializado en la misma transacción (ADR-003), con deduplicación por Idempotency-Key (ADR-004).
   */
  async createMovimiento(
    dto: CreateMovimientoDto,
    usuarioId: string,
    idempotencyKey: string,
  ) {
    const { id } = await this.registrarMovimiento(
      dto,
      usuarioId,
      idempotencyKey,
    );
    return this.buildMovimientoResponse(id);
  }

  /**
   * Núcleo de registro: valida, deduplica por Idempotency-Key y persiste en el ledger dentro de
   * una transacción. Devuelve si el movimiento se creó ('processed') o si la key ya existía con
   * el mismo payload ('duplicate'). Lo usan tanto el endpoint sincrónico como el batch de sync.
   */
  async registrarMovimiento(
    dto: CreateMovimientoDto,
    usuarioId: string,
    idempotencyKey: string,
  ): Promise<{ status: 'processed' | 'duplicate'; id: string }> {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException(
        'El header idempotency-key es obligatorio para registrar movimientos de inventario',
      );
    }

    if (dto.tipo === MovimientoTipoDto.TRASLADO && !dto.ubicacionDestinoId) {
      throw new BadRequestException(
        'El traslado requiere especificar ubicacionDestinoId',
      );
    }

    if (
      (dto.tipo === MovimientoTipoDto.AJUSTE ||
        dto.tipo === MovimientoTipoDto.DEVOLUCION) &&
      !dto.motivo?.trim()
    ) {
      throw new BadRequestException(
        'El motivo es obligatorio para movimientos de tipo AJUSTE o DEVOLUCION',
      );
    }

    const existente = await this.prisma.movimientoInventario.findUnique({
      where: { idempotencyKey },
    });

    if (existente) {
      const mismoPayload =
        existente.varianteId === dto.varianteId &&
        existente.ubicacionId === dto.ubicacionId &&
        (existente.ubicacionDestinoId || null) ===
          (dto.ubicacionDestinoId || null) &&
        existente.tipo === MovimientoTipo[dto.tipo] &&
        existente.cantidad === dto.cantidad;

      if (!mismoPayload) {
        throw new ConflictException(
          'La Idempotency-Key ya fue usada con un payload de movimiento distinto',
        );
      }

      return { status: 'duplicate' as const, id: existente.id };
    }

    const variante = await this.prisma.varianteSku.findUnique({
      where: { id: dto.varianteId },
    });
    if (!variante) {
      throw new NotFoundException(
        `Variante con ID ${dto.varianteId} no encontrada`,
      );
    }

    const ubicacion = await this.prisma.ubicacion.findUnique({
      where: { id: dto.ubicacionId },
    });
    if (!ubicacion) {
      throw new NotFoundException(
        `Ubicación con ID ${dto.ubicacionId} no encontrada`,
      );
    }

    if (dto.tipo === MovimientoTipoDto.TRASLADO) {
      const destino = await this.prisma.ubicacion.findUnique({
        where: { id: dto.ubicacionDestinoId! },
      });
      if (!destino) {
        throw new NotFoundException(
          `Ubicación destino con ID ${dto.ubicacionDestinoId} no encontrada`,
        );
      }
    }

    if (dto.movimientoReferenciaId) {
      const referencia = await this.prisma.movimientoInventario.findUnique({
        where: { id: dto.movimientoReferenciaId },
      });
      if (!referencia) {
        throw new NotFoundException(
          `Movimiento de referencia ${dto.movimientoReferenciaId} no encontrado`,
        );
      }
    }

    const decrementa = decrementaOrigen(dto);

    const movimientoId = await this.prisma.$transaction(async (tx) => {
      if (decrementa) {
        const saldoOrigen = await tx.saldoInventario.findUnique({
          where: {
            varianteId_ubicacionId: {
              varianteId: dto.varianteId,
              ubicacionId: dto.ubicacionId,
            },
          },
        });
        const disponible = saldoOrigen?.cantidad ?? 0;
        if (disponible < dto.cantidad) {
          throw new UnprocessableEntityException({
            error: 'insufficient_stock',
            message: `Stock insuficiente: disponible ${disponible}, solicitado ${dto.cantidad}`,
            disponible,
            solicitado: dto.cantidad,
          });
        }
      }

      const movimiento = await tx.movimientoInventario.create({
        data: {
          varianteId: dto.varianteId,
          ubicacionId: dto.ubicacionId,
          ubicacionDestinoId:
            dto.tipo === MovimientoTipoDto.TRASLADO
              ? dto.ubicacionDestinoId
              : null,
          tipo: MovimientoTipo[dto.tipo],
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          usuarioId,
          idempotencyKey,
          movimientoReferenciaId: dto.movimientoReferenciaId ?? null,
        },
      });

      const deltaOrigen = decrementa ? -dto.cantidad : dto.cantidad;
      await tx.saldoInventario.upsert({
        where: {
          varianteId_ubicacionId: {
            varianteId: dto.varianteId,
            ubicacionId: dto.ubicacionId,
          },
        },
        update: { cantidad: { increment: deltaOrigen } },
        create: {
          varianteId: dto.varianteId,
          ubicacionId: dto.ubicacionId,
          cantidad: Math.max(deltaOrigen, 0),
        },
      });

      if (dto.tipo === MovimientoTipoDto.TRASLADO && dto.ubicacionDestinoId) {
        await tx.saldoInventario.upsert({
          where: {
            varianteId_ubicacionId: {
              varianteId: dto.varianteId,
              ubicacionId: dto.ubicacionDestinoId,
            },
          },
          update: { cantidad: { increment: dto.cantidad } },
          create: {
            varianteId: dto.varianteId,
            ubicacionId: dto.ubicacionDestinoId,
            cantidad: dto.cantidad,
          },
        });
      }

      return movimiento.id;
    }, TRANSACTION_OPTIONS);

    return { status: 'processed' as const, id: movimientoId };
  }

  /**
   * Procesa un lote de operaciones offline (RF-007 / ADR-004). Cada operación se procesa y
   * reporta de forma individual — nunca todo-o-nada (FA-02): una operación inválida no aborta
   * las demás. La idempotencia por operación garantiza que reenviar el mismo lote produce el
   * mismo estado final (criterio de aceptación RF-007). El permiso por tipo se verifica aquí
   * por operación, porque el guard sincrónico solo cubre un `tipo` por request.
   */
  async procesarBatch(
    operaciones: BatchOperacion[],
    usuario: { id: string; rol: string },
  ) {
    const resultados: BatchResultado[] = [];

    for (const op of operaciones) {
      const tipo = op.payload?.tipo;
      try {
        if (!puedeRegistrarMovimiento(usuario.rol, tipo)) {
          resultados.push({
            idempotencyKey: op.idempotencyKey,
            status: 'error',
            detalle: `El rol '${usuario.rol}' no puede registrar movimientos de tipo '${tipo ?? '(vacío)'}'`,
          });
          continue;
        }

        const { status } = await this.registrarMovimiento(
          op.payload,
          usuario.id,
          op.idempotencyKey,
        );
        resultados.push({ idempotencyKey: op.idempotencyKey, status });
      } catch (err) {
        // El batch reporta el error de la operación y sigue; no propaga la excepción.
        const detalle =
          err instanceof HttpException
            ? (() => {
                const r = err.getResponse();
                if (typeof r === 'string') return r;
                const obj = r as Record<string, unknown>;
                return (
                  (obj.error as string) ||
                  (obj.message as string) ||
                  err.message
                );
              })()
            : 'error_interno';
        resultados.push({
          idempotencyKey: op.idempotencyKey,
          status: 'error',
          detalle,
        });
      }
    }

    return { resultados };
  }

  /**
   * Cambio de talla (RF-008): dos movimientos ligados y atómicos en una sola transacción —
   * DEVOLUCION de la prenda devuelta (vuelve a stock) y SALIDA de la nueva (sale de stock),
   * ligados por `movimientoReferenciaId`. Si la SALIDA falla por stock insuficiente, la
   * DEVOLUCION tampoco se persiste: nunca queda medio cambio aplicado.
   */
  async cambioTalla(
    dto: CambioTallaDto,
    usuarioId: string,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(
        'El header idempotency-key es obligatorio para un cambio de talla',
      );
    }
    if (dto.varianteDevueltaId === dto.varianteNuevaId) {
      throw new BadRequestException(
        'La variante devuelta y la nueva no pueden ser la misma',
      );
    }

    const keyDevolucion = `${idempotencyKey}:devolucion`;
    const keySalida = `${idempotencyKey}:salida`;

    // Idempotencia del par: si ya se procesó este cambio, se devuelve sin re-aplicar.
    const yaProcesado = await this.prisma.movimientoInventario.findUnique({
      where: { idempotencyKey: keyDevolucion },
    });
    if (yaProcesado) {
      return this.buildCambioTallaResponse(keyDevolucion, keySalida);
    }

    for (const varId of [dto.varianteDevueltaId, dto.varianteNuevaId]) {
      const v = await this.prisma.varianteSku.findUnique({
        where: { id: varId },
      });
      if (!v) throw new NotFoundException(`Variante ${varId} no encontrada`);
    }
    const ubicacion = await this.prisma.ubicacion.findUnique({
      where: { id: dto.ubicacionId },
    });
    if (!ubicacion)
      throw new NotFoundException(`Ubicación ${dto.ubicacionId} no encontrada`);

    await this.prisma.$transaction(async (tx) => {
      const saldoNueva = await tx.saldoInventario.findUnique({
        where: {
          varianteId_ubicacionId: {
            varianteId: dto.varianteNuevaId,
            ubicacionId: dto.ubicacionId,
          },
        },
      });
      const disponible = saldoNueva?.cantidad ?? 0;
      if (disponible < dto.cantidad) {
        throw new UnprocessableEntityException({
          error: 'insufficient_stock',
          message: `Stock insuficiente de la talla nueva: disponible ${disponible}, solicitado ${dto.cantidad}`,
          disponible,
          solicitado: dto.cantidad,
        });
      }

      const devolucion = await tx.movimientoInventario.create({
        data: {
          varianteId: dto.varianteDevueltaId,
          ubicacionId: dto.ubicacionId,
          tipo: MovimientoTipo.DEVOLUCION,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          usuarioId,
          idempotencyKey: keyDevolucion,
        },
      });
      await tx.saldoInventario.upsert({
        where: {
          varianteId_ubicacionId: {
            varianteId: dto.varianteDevueltaId,
            ubicacionId: dto.ubicacionId,
          },
        },
        update: { cantidad: { increment: dto.cantidad } },
        create: {
          varianteId: dto.varianteDevueltaId,
          ubicacionId: dto.ubicacionId,
          cantidad: dto.cantidad,
        },
      });

      await tx.movimientoInventario.create({
        data: {
          varianteId: dto.varianteNuevaId,
          ubicacionId: dto.ubicacionId,
          tipo: MovimientoTipo.SALIDA,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          usuarioId,
          idempotencyKey: keySalida,
          movimientoReferenciaId: devolucion.id,
        },
      });
      await tx.saldoInventario.update({
        where: {
          varianteId_ubicacionId: {
            varianteId: dto.varianteNuevaId,
            ubicacionId: dto.ubicacionId,
          },
        },
        data: { cantidad: { decrement: dto.cantidad } },
      });
    }, TRANSACTION_OPTIONS);

    return this.buildCambioTallaResponse(keyDevolucion, keySalida);
  }

  private async buildCambioTallaResponse(
    keyDevolucion: string,
    keySalida: string,
  ) {
    const [devolucion, salida] = await Promise.all([
      this.prisma.movimientoInventario.findUnique({
        where: { idempotencyKey: keyDevolucion },
      }),
      this.prisma.movimientoInventario.findUnique({
        where: { idempotencyKey: keySalida },
      }),
    ]);
    return { cambioTalla: { devolucion, salida } };
  }

  private async buildMovimientoResponse(movimientoId: string) {
    const movimiento = await this.prisma.movimientoInventario.findUnique({
      where: { id: movimientoId },
      include: {
        variante: {
          select: { id: true, skuCode: true, talla: true, color: true },
        },
        ubicacion: { select: { id: true, nombre: true, tipo: true } },
        ubicacionDestino: { select: { id: true, nombre: true, tipo: true } },
        usuario: { select: { id: true, nombre: true, rol: true } },
      },
    });

    const saldos = await this.prisma.saldoInventario.findMany({
      where: { varianteId: movimiento!.varianteId },
      include: {
        ubicacion: { select: { id: true, nombre: true, tipo: true } },
      },
    });

    return { movimiento, saldos };
  }

  /**
   * Historial paginado del ledger de movimientos, con límite superior fijo para evitar
   * que una paginación sin cota agote memoria o conexiones (ver hallazgo SEC-12).
   */
  async getMovimientos(page = 1, limit = 20, tipo?: string) {
    const take = Math.min(Math.max(Math.trunc(limit) || 20, 1), MAX_LIMIT);
    const currentPage = Math.max(Math.trunc(page) || 1, 1);
    const skip = (currentPage - 1) * take;

    const where: { tipo?: MovimientoTipo } = {};
    if (tipo && tipo !== 'TODOS' && tipo in MovimientoTipo) {
      where.tipo = MovimientoTipo[tipo as keyof typeof MovimientoTipo];
    }

    const [items, total] = await Promise.all([
      this.prisma.movimientoInventario.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          variante: {
            select: { id: true, skuCode: true, talla: true, color: true },
          },
          ubicacion: { select: { id: true, nombre: true } },
          ubicacionDestino: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true, rol: true } },
        },
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Saldo de stock por variante/SKU con desglose por ubicación (RF-004). Requiere autenticación
   * en el controlador — este dato nunca es público.
   */
  async getStock(query: QueryStockDto) {
    if (!query.varianteId && !query.sku) {
      throw new BadRequestException(
        'Debes indicar varianteId o sku para consultar el stock',
      );
    }

    const variante = await this.prisma.varianteSku.findFirst({
      where: query.varianteId
        ? { id: query.varianteId }
        : { skuCode: query.sku },
    });

    if (!variante) {
      throw new NotFoundException('Variante no encontrada');
    }

    const saldos = await this.prisma.saldoInventario.findMany({
      where: { varianteId: variante.id },
      include: {
        ubicacion: { select: { id: true, nombre: true, tipo: true } },
      },
    });

    const total = saldos.reduce((sum, s) => sum + s.cantidad, 0);

    return {
      varianteId: variante.id,
      skuCode: variante.skuCode,
      talla: variante.talla,
      color: variante.color,
      saldos,
      total,
    };
  }

  /**
   * Consulta rápida omnicanal por término libre (SKU, nombre, talla o color) con desglose
   * de stock por ubicación, para vendedores y bodega.
   */
  async buscarStockRapido(q?: string, categoriaId?: string) {
    const where: Prisma.VarianteSkuWhereInput = { activo: true };

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { skuCode: { contains: term, mode: 'insensitive' } },
        { talla: { contains: term, mode: 'insensitive' } },
        { color: { contains: term, mode: 'insensitive' } },
        { producto: { nombre: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (categoriaId) {
      where.producto = { categoriaId };
    }

    const variantes = await this.prisma.varianteSku.findMany({
      where,
      take: 25,
      include: {
        producto: { select: { id: true, nombre: true } },
        saldos: {
          include: {
            ubicacion: { select: { id: true, nombre: true, tipo: true } },
          },
        },
      },
    });

    return variantes.map((v) => ({
      varianteId: v.id,
      skuCode: v.skuCode,
      talla: v.talla,
      color: v.color,
      producto: v.producto,
      stockTotal: v.saldos.reduce((sum, s) => sum + s.cantidad, 0),
      desglose: v.saldos.map((s) => ({
        ubicacionId: s.ubicacion.id,
        ubicacion: s.ubicacion.nombre,
        tipo: s.ubicacion.tipo,
        cantidad: s.cantidad,
      })),
    }));
  }

  /**
   * Métricas consolidadas para el panel de administración.
   */
  async getDashboardStats() {
    const [
      totalProductos,
      totalVariantes,
      saldos,
      ubicaciones,
      ultimosMovimientos,
    ] = await Promise.all([
      this.prisma.producto.count(),
      this.prisma.varianteSku.count({ where: { activo: true } }),
      this.prisma.saldoInventario.findMany({
        include: {
          ubicacion: { select: { id: true, nombre: true, tipo: true } },
        },
      }),
      this.prisma.ubicacion.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, tipo: true },
      }),
      this.prisma.movimientoInventario.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          variante: { select: { skuCode: true, talla: true, color: true } },
          ubicacion: { select: { nombre: true } },
          usuario: { select: { nombre: true, rol: true } },
        },
      }),
    ]);

    const stockTotal = saldos.reduce((sum, s) => sum + s.cantidad, 0);

    const resumenPorUbicacion = ubicaciones.map((u) => ({
      ubicacionId: u.id,
      nombre: u.nombre,
      tipo: u.tipo,
      stock: saldos
        .filter((s) => s.ubicacionId === u.id)
        .reduce((sum, s) => sum + s.cantidad, 0),
    }));

    return {
      totalProductos,
      totalVariantes,
      stockTotal,
      resumenPorUbicacion,
      ultimosMovimientos,
    };
  }
}
