/**
 * Matriz de permisos por tipo de movimiento — fuente de verdad única (SRS RF-006).
 * La consumen tanto `MovimientoRbacGuard` (endpoint sincrónico) como el procesamiento de
 * `/api/sync/batch`, donde un solo request trae operaciones de tipos distintos y el guard,
 * que lee un único `body.tipo`, no alcanza a cubrir cada operación por separado.
 */
export const MATRIZ_PERMISOS_MOVIMIENTO: Record<string, readonly string[]> = {
  ENTRADA: ['ADMIN', 'BODEGA'],
  SALIDA: ['ADMIN', 'VENDEDOR'],
  AJUSTE: ['ADMIN', 'BODEGA'],
  TRASLADO: ['ADMIN', 'BODEGA'],
  DEVOLUCION: ['ADMIN', 'VENDEDOR'],
};

/** `true` si `rol` puede registrar un movimiento de `tipo`. Tipo desconocido → deniega. */
export function puedeRegistrarMovimiento(
  rol: string | undefined,
  tipo: string | undefined,
): boolean {
  if (!rol || !tipo) return false;
  const permitidos = MATRIZ_PERMISOS_MOVIMIENTO[tipo];
  return !!permitidos && permitidos.includes(rol);
}
