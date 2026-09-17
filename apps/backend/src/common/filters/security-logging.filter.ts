import { Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';

/**
 * Filtro global que registra los eventos de seguridad que exige la política de logging del SRS
 * (Sección 5): autorizaciones fallidas (401/403), bloqueos por rate limiting (429) y errores
 * 5xx. Extiende el filtro base de Nest y delega en él, así que **no altera** el cuerpo ni el
 * formato de la respuesta de error — solo añade el log estructurado.
 *
 * Nunca registra password, token, ni el cuerpo del request: solo método, ruta, IP, status y, si
 * está identificado, el usuario. Un mensaje interno de 5xx se registra, pero no se devuelve al
 * cliente (de eso se encarga el filtro base).
 */
@Catch()
export class SecurityLoggingFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('SecurityAudit');

  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    if (status === 401 || status === 403 || status === 429 || status >= 500) {
      const evento =
        status === 429
          ? 'ratelimit.blocked'
          : status === 401 || status === 403
            ? 'authz.denied'
            : 'server.error';

      const userId = (req as { user?: { id?: string } }).user?.id;

      this.logger.warn(
        JSON.stringify({
          event: evento,
          status,
          method: req.method,
          path: req.originalUrl?.split('?')[0],
          ip: req.ip,
          ...(userId ? { userId } : {}),
          // Solo para 5xx: el mensaje interno ayuda a diagnosticar, pero no incluye datos del
          // usuario ni el payload.
          ...(status >= 500 && exception instanceof Error
            ? { internal: exception.message }
            : {}),
        }),
      );
    }

    super.catch(exception, host);
  }
}
