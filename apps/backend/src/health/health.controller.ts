import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health checks independientes por preocupación (ADR-001): el catálogo público y el módulo de
 * inventario comparten proceso, así que un check separado de la base de datos permite distinguir
 * "el proceso está vivo" de "la base responde" sin depender de un endpoint de negocio.
 */
@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness — el proceso responde' })
  liveness() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness — la base de datos responde' })
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      return { status: 'degraded', db: 'down' };
    }
  }
}
