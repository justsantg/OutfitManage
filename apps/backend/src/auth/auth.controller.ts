import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@ApiTags('Autenticación')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Máximo 5 intentos por minuto por IP contra ataques de fuerza bruta (SRS 6.5 / 7 T-005)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Verifica credenciales (email y password) y retorna token JWT Bearer. Protegido con Rate Limiting (5 intentos/min).',
  })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso con token JWT',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos. Intenta más tarde.',
  })
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    return this.authService.login(loginDto, ip);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Máximo 3 registros por minuto por IP
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crea una nueva cuenta de usuario con contraseña hasheada y retorna token JWT inicial.',
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos. Intenta más tarde.',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Límite más alto que el de login: una sesión activa renueva de forma legítima cada 15 min,
  // pero sigue acotado para que un refresh token robado no sirva para generar access tokens en masa.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar el access token',
    description:
      'Rota el refresh token: el presentado queda revocado y se emite uno nuevo. Reusar un token ' +
      'ya rotado revoca toda la familia de tokens de esa sesión (SRS Sección 5).',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado, revocado o reusado',
  })
  async refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string) {
    return this.authService.refresh(dto.refreshToken, ip);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Revoca la familia completa de refresh tokens de la sesión. El access token vigente expira por sí solo.',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
  ) {
    return this.authService.logout(dto.refreshToken, req.user.id, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description:
      'Retorna los datos del usuario extraídos del token JWT actual.',
  })
  @ApiResponse({ status: 200, description: 'Perfil de usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
