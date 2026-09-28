import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateMovimientoDto } from './create-movimiento.dto';

export class SyncOperacionDto {
  @ApiProperty({
    description:
      'Idempotency-Key (UUID v4) generada por el cliente offline para esta operación. El backend deduplica por ella.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;

  @ApiProperty({
    description: 'Payload del movimiento a registrar',
    type: CreateMovimientoDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateMovimientoDto)
  payload: CreateMovimientoDto;
}

export class SyncBatchDto {
  @ApiProperty({
    description:
      'Operaciones encoladas offline. Se procesan individualmente: una inválida no aborta las demás (SRS RF-007 FA-02).',
    type: [SyncOperacionDto],
  })
  @IsArray()
  // Cota superior: el SRS dimensiona un batch en hasta 100 operaciones (Sección 5, Rendimiento).
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncOperacionDto)
  operaciones: SyncOperacionDto[];
}
