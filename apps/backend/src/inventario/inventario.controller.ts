import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { InventarioService } from './inventario.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import { SyncBatchDto } from './dto/sync-batch.dto';
import { CambioTallaDto } from './dto/cambio-talla.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { MovimientoRbacGuard } from '../common/guards/movimiento-rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

// Consultar stock (sin costo) está permitido a los tres roles internos (SRS RF-006).
// El registro de movimientos se restringe además por tipo vía MovimientoRbacGuard.
@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('ADMIN', 'VENDEDOR', 'BODEGA')
@Controller('api/inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Estadísticas generales del panel de administración',
    description:
      'Retorna conteos de productos, variantes, stock consolidado, resumen por ubicación y últimos movimientos.',
  })
  getDashboardStats() {
    return this.inventarioService.getDashboardStats();
  }

  @Get('buscar')
  @ApiOperation({
    summary: 'Consulta rápida omnicanal de stock (Vendedores y Bodega)',
    description:
      'Búsqueda por término (SKU, nombre, talla, color) con latencia < 300ms y desglose por tienda y bodega.',
  })
  @ApiQuery({ name: 'q', required: false, type: String, example: 'polo azul' })
  @ApiQuery({ name: 'categoriaId', required: false, type: String })
  buscarStockRapido(
    @Query('q') q?: string,
    @Query('categoriaId') categoriaId?: string,
  ) {
    return this.inventarioService.buscarStockRapido(q, categoriaId);
  }

  @Get('movimientos')
  @ApiOperation({
    summary: 'Historial de movimientos de inventario',
    description:
      'Lista paginada de todos los movimientos registrados en el ledger con autoría y ubicación.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'tipo', required: false, type: String, example: 'TODOS' })
  getMovimientos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.inventarioService.getMovimientos(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      tipo,
    );
  }

  @Post('movimientos')
  @UseGuards(MovimientoRbacGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar movimiento de inventario',
    description:
      'Registra un movimiento (entrada/salida/ajuste/traslado/devolución) con idempotencia y trazabilidad. ' +
      'Requiere header Idempotency-Key (UUID v4). ' +
      'Matriz de permisos SRS RF-006: ENTRADA (ADMIN, BODEGA), SALIDA (ADMIN, VENDEDOR), AJUSTE (ADMIN, BODEGA), TRASLADO (ADMIN, BODEGA), DEVOLUCION (ADMIN, VENDEDOR).',
  })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'UUID v4 único por operación (obligatorio)',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  createMovimiento(
    @Body() dto: CreateMovimientoDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventarioService.createMovimiento(
      dto,
      req.user.id,
      idempotencyKey,
    );
  }

  @Post('sync/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sincronizar un lote de operaciones offline (app móvil)',
    description:
      'Procesa operaciones encoladas sin conexión, cada una con su propia Idempotency-Key ' +
      '(RF-007 / ADR-004). Responde por operación con status processed/duplicate/error; nunca ' +
      'es todo-o-nada. El permiso por tipo de movimiento se valida por operación (matriz RF-006). ' +
      'Reenviar el mismo lote produce el mismo estado final.',
  })
  syncBatch(@Body() dto: SyncBatchDto, @Req() req: AuthenticatedRequest) {
    return this.inventarioService.procesarBatch(dto.operaciones, {
      id: req.user.id,
      rol: req.user.rol,
    });
  }

  @Post('cambio-talla')
  @Roles('ADMIN', 'VENDEDOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un cambio de talla (RF-008)',
    description:
      'Crea dos movimientos ligados y atómicos: DEVOLUCION de la prenda devuelta + SALIDA de la ' +
      'nueva. Permitido a ADMIN y VENDEDOR. Requiere Idempotency-Key.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'UUID v4 único por operación (obligatorio)',
    required: true,
  })
  cambioTalla(
    @Body() dto: CambioTallaDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventarioService.cambioTalla(dto, req.user.id, idempotencyKey);
  }

  @Get('stock')
  @ApiOperation({
    summary: 'Consultar saldo de stock por variante/SKU',
    description:
      'Retorna saldo por ubicación y total. Requiere autenticación — dato nunca público.',
  })
  getStock(@Query() query: QueryStockDto) {
    return this.inventarioService.getStock(query);
  }
}
