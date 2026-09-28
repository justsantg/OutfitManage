import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { SecurityLoggingFilter } from './common/filters/security-logging.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Cabeceras de seguridad obligatorias en producción (SRS Sección 5). Se aplican sin depender
  // de una librería externa para no introducir una dependencia nueva sin poder verificar su
  // instalación en este entorno.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains',
    );
    next();
  });

  // Filtro global que registra 401/403/429/5xx (política de logging del SRS §5) sin cambiar el
  // formato de las respuestas de error.
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SecurityLoggingFilter(httpAdapterHost.httpAdapter));

  // Habilitar ValidationPipe global para DTOs con conversión implícita de query params
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuración de CORS con allowlist explícita, nunca wildcard (SRS Sección 5 / copilot-instructions.md)
  const corsOriginEnv = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((o) => o.trim())
    : [];
  const isDevelopment = configService.get<string>('NODE_ENV') !== 'production';
  // Regex de red local, solo activo fuera de producción, para probar la PWA desde el celular
  // en la misma Wi-Fi (ver Markdowns/guia-ejecucion-y-despliegue.md, sección 5).
  const localNetworkRegex =
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Sin header Origin (curl, servidor-a-servidor): no es una petición de navegador, se permite.
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (isDevelopment && localNetworkRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`Origen no permitido por CORS: ${origin}`),
        false,
      );
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Configuración de Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tienda360 API')
    .setDescription(
      'API Backend del sistema Tienda360 — Catálogo Virtual + Gestor de Inventario.\n\n' +
        '**Autenticación:** Usa el botón "Authorize" con tu JWT Bearer token.\n\n' +
        '**Roles:** ADMIN, VENDEDOR, BODEGA',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'idempotency-key',
        in: 'header',
        description: 'UUID v4 único por operación de inventario',
      },
      'idempotency-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(
    `Servidor Backend Tienda360 corriendo en http://localhost:${port}`,
  );
  logger.log(`Swagger UI disponible en http://localhost:${port}/api/docs`);
}

void bootstrap();
