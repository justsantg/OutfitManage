import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const secret = configService.get<string>('JWT_SECRET');
        const expiration = configService.get<string>(
          'JWT_ACCESS_EXPIRATION',
          '15m',
        ) as SignOptions['expiresIn'];

        if (privateKey) {
          return {
            privateKey,
            publicKey: configService.get<string>('JWT_PUBLIC_KEY'),
            signOptions: { algorithm: 'RS256', expiresIn: expiration },
          };
        }

        // Nunca cae a un secreto por defecto embebido en el código: cualquiera que lea este
        // repositorio podría firmar tokens válidos. Sin JWT_PRIVATE_KEY ni JWT_SECRET, el
        // arranque falla explícitamente en vez de exponer una clave conocida.
        if (!secret) {
          throw new Error(
            'JWT_SECRET o JWT_PRIVATE_KEY/JWT_PUBLIC_KEY deben estar configurados. No hay valor por defecto.',
          );
        }

        return {
          secret,
          signOptions: { expiresIn: expiration },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, JwtStrategy],
  exports: [AuthService, RefreshTokenService, JwtStrategy, PassportModule],
})
export class AuthModule {}
