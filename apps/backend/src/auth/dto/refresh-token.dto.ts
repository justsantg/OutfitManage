import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Refresh token entregado en el login o en la renovación anterior. Se rota en cada uso.',
    example: 'a3f1...9c2e',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
