import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import {
  MATRIZ_PERMISOS_MOVIMIENTO,
  puedeRegistrarMovimiento,
} from '../rbac/movimiento-permisos';

// Los guards corren antes que el ValidationPipe (que recién transforma el body en un
// CreateMovimientoDto), así que aquí el body sigue siendo el JSON crudo — se tipa solo el
// campo que este guard necesita leer.
interface RequestWithMovimientoBody extends AuthenticatedRequest {
  body: { tipo?: string };
}

@Injectable()
export class MovimientoRbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithMovimientoBody>();
    const { user, body } = request;
    const tipo = body?.tipo ?? '';

    if (!MATRIZ_PERMISOS_MOVIMIENTO[tipo]) {
      // Un tipo inválido lo rechaza el ValidationPipe antes de llegar aquí en el flujo normal;
      // si de algún modo llega, se deniega por defecto (fail-closed).
      throw new ForbiddenException(
        `Tipo de movimiento '${tipo}' no reconocido`,
      );
    }

    if (!puedeRegistrarMovimiento(user?.rol, tipo)) {
      throw new ForbiddenException(
        `El rol '${user?.rol}' no tiene permiso para registrar movimientos de tipo '${tipo}' (matriz RF-006)`,
      );
    }

    return true;
  }
}
