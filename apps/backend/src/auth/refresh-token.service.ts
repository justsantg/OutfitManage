import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Emisión, rotación y revocación de refresh tokens (SRS Sección 5: "access token de vida corta,
 * refresh token con rotación").
 *
 * Tres decisiones que conviene no revertir sin entender el motivo:
 *
 * 1. El token viaja al cliente en claro pero se persiste solo como SHA-256. Un volcado de la
 *    tabla no permite suplantar a nadie. No se usa bcrypt aquí porque el token ya es un valor
 *    aleatorio de 256 bits — no tiene entropía baja que proteger contra fuerza bruta, y el
 *    refresh se ejecuta en el camino crítico de cada renovación de sesión.
 * 2. Cada refresh rota: revoca el token presentado y emite uno nuevo en la misma "familia".
 * 3. Si llega un token ya rotado (revocado pero con sucesor), se asume robo y se revoca la
 *    familia entera, no solo ese token. Es la contramedida estándar de reuso: el atacante y el
 *    usuario legítimo compiten por el mismo linaje, y el segundo en usarlo lo invalida todo.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly ttlDias: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ttlDias = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION_DIAS', '30'),
    );
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private nuevaExpiracion(): Date {
    return new Date(Date.now() + this.ttlDias * 24 * 60 * 60 * 1000);
  }

  /** Emite el primer refresh token de una sesión nueva (login o registro). */
  async emitir(usuarioId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        usuarioId,
        tokenHash: this.hash(token),
        familiaId: randomUUID(),
        expiraEn: this.nuevaExpiracion(),
      },
    });

    return token;
  }

  /**
   * Valida el token presentado y lo rota. Devuelve el usuario y el refresh token nuevo.
   * Lanza 401 ante token inexistente, expirado, revocado o reusado.
   */
  async rotar(token: string): Promise<{ usuarioId: string; token: string }> {
    if (!token?.trim()) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { usuario: { select: { id: true, activo: true } } },
    });

    if (!registro) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Reuso de un token ya rotado: el linaje completo se considera comprometido.
    if (registro.revocadoEn) {
      await this.revocarFamilia(registro.familiaId);
      this.logger.warn(
        JSON.stringify({
          event: 'auth.refresh.reuse_detected',
          usuarioId: registro.usuarioId,
          familiaId: registro.familiaId,
        }),
      );
      throw new UnauthorizedException(
        'Refresh token ya utilizado; la sesión fue revocada por seguridad',
      );
    }

    if (registro.expiraEn.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (!registro.usuario.activo) {
      await this.revocarFamilia(registro.familiaId);
      throw new UnauthorizedException('Usuario inactivo');
    }

    const tokenNuevo = randomBytes(32).toString('hex');

    // La rotación es atómica: si falla a mitad, no queda ni el token viejo revocado sin
    // sucesor ni dos tokens vivos en la misma familia.
    await this.prisma.$transaction(async (tx) => {
      const creado = await tx.refreshToken.create({
        data: {
          usuarioId: registro.usuarioId,
          tokenHash: this.hash(tokenNuevo),
          familiaId: registro.familiaId,
          expiraEn: this.nuevaExpiracion(),
        },
      });

      await tx.refreshToken.update({
        where: { id: registro.id },
        data: { revocadoEn: new Date(), reemplazadoPorId: creado.id },
      });
    });

    return { usuarioId: registro.usuarioId, token: tokenNuevo };
  }

  /** Cierre de sesión: revoca la familia del token presentado. Nunca falla si el token no existe. */
  async revocarPorToken(token: string): Promise<void> {
    if (!token?.trim()) return;

    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(token) },
      select: { familiaId: true },
    });

    if (registro) {
      await this.revocarFamilia(registro.familiaId);
    }
  }

  private async revocarFamilia(familiaId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familiaId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }
}
