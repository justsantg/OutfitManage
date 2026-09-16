import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

@Injectable()
export class CatalogoService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {}

  /**
   * Listado de productos para el catálogo público.
   * Resuelve automáticamente URLs firmadas de Supabase Storage y disponibilidad de stock.
   */
  async getCatalogo(query: QueryCatalogoDto) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductoWhereInput = {
      visiblePublico: true,
    };

    if (query.categoria) {
      where.categoriaId = query.categoria;
    }

    if (query.q) {
      where.OR = [
        { nombre: { contains: query.q, mode: 'insensitive' } },
        { descripcion: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.talla || query.color) {
      where.variantes = {
        some: {
          activo: true,
          ...(query.talla
            ? { talla: { equals: query.talla, mode: 'insensitive' } }
            : {}),
          ...(query.color
            ? { color: { equals: query.color, mode: 'insensitive' } }
            : {}),
        },
      };
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
          imagenes: {
            where: { varianteId: null },
            orderBy: { orden: 'asc' },
            select: {
              urlStorage: true,
            },
          },
          variantes: {
            where: { activo: true },
            select: {
              id: true,
              skuCode: true,
              talla: true,
              color: true,
              atributoOpcional: true,
              imagenes: {
                orderBy: { orden: 'asc' },
                select: {
                  urlStorage: true,
                  orden: true,
                },
              },
              precios: {
                where: { vigenteHasta: null },
                orderBy: { vigenteDesde: 'desc' },
                take: 1,
                select: { precio: true },
              },
              saldos: {
                select: { cantidad: true },
              },
            },
          },
        },
      }),
      this.prisma.producto.count({ where }),
    ]);

    // Sanitización y resolución de URLs firmadas
    const items = await Promise.all(
      productos.map(async (p) => {
        const primerPrecio = p.variantes.find((v) => v.precios.length > 0)
          ?.precios[0]?.precio;

        const rawImg = p.imagenes[0]?.urlStorage || null;
        const imagenPrincipal = rawImg
          ? await this.storageService.resolveSignedMediaUrl(rawImg)
          : null;

        const variantesPublicas = await Promise.all(
          p.variantes.map(async (v) => {
            const varImgsFirmadas = await Promise.all(
              (v.imagenes || []).map(async (img) => ({
                url: await this.storageService.resolveSignedMediaUrl(
                  img.urlStorage,
                ),
                tipo: this.storageService.getMediaType(img.urlStorage),
                orden: img.orden,
              })),
            );

            const stockTotal = v.saldos.reduce((sum, s) => sum + s.cantidad, 0);

            return {
              id: v.id,
              skuCode: v.skuCode,
              talla: v.talla,
              color: v.color,
              atributoOpcional: v.atributoOpcional,
              imagenes: varImgsFirmadas,
              imagenUrl: varImgsFirmadas[0]?.url || null,
              disponible: stockTotal > 0,
              // Solo estado categórico, nunca la cantidad exacta (SRS 6.5: el catálogo
              // público oculta cantidades de stock y costos).
              stockStatus:
                stockTotal === 0
                  ? 'OUT_OF_STOCK'
                  : stockTotal <= 3
                    ? 'LOW_STOCK'
                    : 'IN_STOCK',
            };
          }),
        );

        return {
          productoId: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          categoria: p.categoria,
          precioActual: primerPrecio ? Number(primerPrecio) : null,
          imagenPrincipal,
          variantes: variantesPublicas,
        };
      }),
    );

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detalle público de un producto por ID.
   * Incluye galería completa de imágenes/videos firmados de Supabase Storage y stock por variante.
   */
  async getProductoDetalle(id: string) {
    const producto = await this.prisma.producto.findFirst({
      where: {
        id,
        visiblePublico: true,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
        imagenes: {
          where: { varianteId: null },
          orderBy: { orden: 'asc' },
          select: {
            urlStorage: true,
            orden: true,
          },
        },
        variantes: {
          where: { activo: true },
          select: {
            id: true,
            skuCode: true,
            talla: true,
            color: true,
            atributoOpcional: true,
            imagenes: {
              orderBy: { orden: 'asc' },
              select: {
                urlStorage: true,
                orden: true,
              },
            },
            precios: {
              where: { vigenteHasta: null },
              orderBy: { vigenteDesde: 'desc' },
              take: 1,
              select: { precio: true },
            },
            saldos: {
              select: { cantidad: true },
            },
          },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `Producto no encontrado o no disponible en el catálogo`,
      );
    }

    const primerPrecio = producto.variantes.find((v) => v.precios.length > 0)
      ?.precios[0]?.precio;

    const imagenesFirmadas = await Promise.all(
      producto.imagenes.map(async (img) => {
        const resolved = await this.storageService.resolveSignedMediaUrl(
          img.urlStorage,
        );
        return {
          url: resolved,
          urlStorage: resolved,
          tipo: this.storageService.getMediaType(img.urlStorage),
          orden: img.orden,
        };
      }),
    );

    const variantesPublicas = await Promise.all(
      producto.variantes.map(async (v) => {
        const varImgsFirmadas = await Promise.all(
          (v.imagenes || []).map(async (img) => ({
            url: await this.storageService.resolveSignedMediaUrl(
              img.urlStorage,
            ),
            tipo: this.storageService.getMediaType(img.urlStorage),
            orden: img.orden,
          })),
        );

        const stockTotal = v.saldos.reduce((sum, s) => sum + s.cantidad, 0);

        return {
          id: v.id,
          skuCode: v.skuCode,
          talla: v.talla,
          color: v.color,
          atributoOpcional: v.atributoOpcional,
          imagenes: varImgsFirmadas,
          imagenUrl: varImgsFirmadas[0]?.url || null,
          precio: v.precios[0]?.precio ? Number(v.precios[0].precio) : null,
          disponible: stockTotal > 0,
          stockStatus:
            stockTotal === 0
              ? 'OUT_OF_STOCK'
              : stockTotal <= 3
                ? 'LOW_STOCK'
                : 'IN_STOCK',
        };
      }),
    );

    // Generación server-side del Deep Link de WhatsApp (SRS 6.5)
    const phone = this.configService.get<string>(
      'TIENDA_WHATSAPP_PHONE',
      '573001234567',
    );
    const tiendaNombre = this.configService.get<string>(
      'TIENDA_NOMBRE',
      'Tienda360',
    );
    const mensaje = `¡Hola ${tiendaNombre}! Estoy interesado(a) en el producto *${producto.nombre}* que vi en su catálogo virtual. ¿Está disponible?`;
    const whatsappLink = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`;

    return {
      productoId: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      precioActual: primerPrecio ? Number(primerPrecio) : null,
      imagenes: imagenesFirmadas,
      variantes: variantesPublicas,
      whatsappLink,
    };
  }

  /**
   * Lista de categorías activas para los filtros del catálogo público.
   */
  async getCategoriasPublicas() {
    return this.prisma.categoria.findMany({
      where: {
        activo: true,
        productos: {
          some: {
            visiblePublico: true,
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            productos: {
              where: { visiblePublico: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }
}
