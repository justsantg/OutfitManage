import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Registro público. Nunca acepta un rol del llamador: RegisterDto no expone ese campo. La
   * creación de personal (ADMIN, VENDEDOR, BODEGA) para operación normal es exclusiva de
   * `POST /api/usuarios`, protegido por rol ADMIN — pero esa misma exclusividad crea un
   * problema de arranque: en una instalación nueva no existe ningún ADMIN que pueda crear al
   * primero. Por eso, y solo por eso, el servidor —nunca el llamador— asigna ADMIN de forma
   * automática cuando la base de datos no tiene ningún usuario todavía.
   *
   * Esto es distinto del hallazgo original (SEC-01): allá el cliente elegía el rol via el
   * body; aquí el rol lo decide el servidor a partir de una condición que el cliente no
   * controla (el conteo de usuarios existentes). Ventana de carrera aceptada: si dos registros
   * concurrentes llegan mientras la tabla está vacía, ambos podrían quedar como ADMIN — un
   * escenario que solo puede ocurrir en el primer arranque de una instalación, nunca después.
   */
  async register(registerDto: RegisterDto) {
    const { nombre, email, password } = registerDto;

    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException(
        'El correo electrónico ya se encuentra registrado',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const esInstalacionNueva = (await this.prisma.usuario.count()) === 0;

    const newUser = await this.prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        rol: esInstalacionNueva ? Rol.ADMIN : Rol.CLIENTE,
        activo: true,
      },
    });

    // Generar JWT para login inmediato
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      rol: newUser.rol,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.emitir(newUser.id);

    return {
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
        rol: newUser.rol,
      },
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    };
  }

  /**
   * Inicio de sesión con verificación de credenciales. Respuesta uniforme ante usuario
   * inexistente o password incorrecta, para prevenir enumeración (SRS 6.5).
   */
  async login(loginDto: LoginDto, ip?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // bcrypt.compare devuelve false de forma segura ante cualquier hash que no sea bcrypt,
    // así que no hay fallback de comparación en texto plano ni rama alternativa.
    const isPasswordValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !user.activo || !isPasswordValid) {
      this.logSecurityEvent('warn', 'auth.login.failed', { ip });
      throw new UnauthorizedException('Credenciales de acceso inválidas');
    }

    this.logSecurityEvent('log', 'auth.login.success', { ip, userId: user.id });

    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.emitir(user.id);

    return {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    };
  }

  /**
   * Renueva el access token a partir de un refresh token válido, rotándolo (SRS Sección 5).
   * El access token nuevo se firma con el rol actual del usuario en base de datos, no con el
   * que traía el token anterior: si un ADMIN fue degradado, la renovación refleja el cambio.
   */
  async refresh(refreshToken: string, ip?: string) {
    const { usuarioId, token } =
      await this.refreshTokenService.rotar(refreshToken);

    const user = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!user || !user.activo) {
      this.logSecurityEvent('warn', 'auth.refresh.inactive_user', { ip });
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    this.logSecurityEvent('log', 'auth.refresh.success', {
      ip,
      userId: user.id,
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      rol: user.rol,
    });

    return {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
      accessToken,
      refreshToken: token,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    };
  }

  /** Cierre de sesión: revoca la familia completa del refresh token presentado. */
  async logout(refreshToken: string, userId?: string, ip?: string) {
    await this.refreshTokenService.revocarPorToken(refreshToken);
    this.logSecurityEvent('log', 'auth.logout', { ip, userId });
    return { message: 'Sesión cerrada' };
  }

  /**
   * Log estructurado de eventos de autenticación (SRS: política de logging de seguridad).
   * Nunca incluye password ni token, solo IP, timestamp implícito del logger y, si aplica, userId.
   */
  private logSecurityEvent(
    level: 'log' | 'warn',
    event: string,
    data: Record<string, unknown>,
  ) {
    this.logger[level](JSON.stringify({ event, ...data }));
  }
}
