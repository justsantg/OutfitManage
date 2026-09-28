import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Cambio de talla (RF-008): la prenda devuelta vuelve a stock y la nueva sale. Se modela como
 * dos movimientos ligados (DEVOLUCION de la variante devuelta + SALIDA de la nueva), nunca como
 * edición directa de saldo.
 */
export class CambioTallaDto {
  @ApiProperty({
    description: 'Variante (SKU) que el cliente devuelve',
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  varianteDevueltaId: string;

  @ApiProperty({
    description: 'Variante (SKU) que el cliente se lleva',
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  varianteNuevaId: string;

  @ApiProperty({
    description: 'Ubicación donde ocurre el cambio',
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  ubicacionId: string;

  @ApiProperty({ description: 'Cantidad de prendas cambiadas', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({
    description: 'Motivo del cambio (obligatorio)',
    example: 'Cambio de talla M a L',
  })
  @IsNotEmpty()
  @IsString()
  motivo: string;
}
