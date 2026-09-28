import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CatalogoService } from './catalogo.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// Test de contrato del catálogo público (SRS §9 DoD, riesgo R-004): la respuesta pública NUNCA
// debe exponer costo, margen, proveedor, ni la cantidad exacta de stock. Este test recorre la
// respuesta serializada y falla si aparece cualquiera de esas claves. Es la red que evita que una
// regresión futura vuelva a filtrar `stockRestante` (como ocurrió en SEC-13).
const CLAVES_PROHIBIDAS = [
  'stockRestante',
  'costo',
  'margen',
  'proveedor',
  'passwordHash',
  'cantidad',
  'saldos',
  'precioHistorico',
];

function buscarClaveProhibida(valor: unknown, ruta = ''): string | null {
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) {
      const hit = buscarClaveProhibida(valor[i], `${ruta}[${i}]`);
      if (hit) return hit;
    }
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      if (CLAVES_PROHIBIDAS.includes(k)) return `${ruta}.${k}`;
      const hit = buscarClaveProhibida(v, `${ruta}.${k}`);
      if (hit) return hit;
    }
  }
  return null;
}

describe('CatalogoService — contrato público sin datos sensibles', () => {
  let service: CatalogoService;

  const variante = {
    id: 'v1',
    skuCode: 'SKU-1',
    talla: 'M',
    color: 'Azul',
    atributoOpcional: null,
    imagenes: [],
    precios: [{ precio: 50000 }],
    // El servicio recibe saldos de Prisma pero NO debe reflejarlos crudos en la salida.
    saldos: [
      { cantidad: 2, ubicacionId: 'u1' },
      { cantidad: 1, ubicacionId: 'u2' },
    ],
  };

  const producto = {
    id: 'p1',
    nombre: 'Camiseta',
    descripcion: 'desc',
    categoria: { id: 'c1', nombre: 'Ropa' },
    imagenes: [],
    variantes: [variante],
  };

  beforeEach(async () => {
    const prismaMock = {
      producto: {
        findMany: jest.fn().mockResolvedValue([producto]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(producto),
      },
    };
    const storageMock = {
      resolveSignedMediaUrl: jest.fn().mockResolvedValue('https://signed/x'),
      getMediaType: jest.fn().mockReturnValue('IMAGE'),
    };
    const configMock = { get: jest.fn().mockReturnValue('573000000000') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get(CatalogoService);
  });

  it('getCatalogo no expone ninguna clave sensible', async () => {
    const res = await service.getCatalogo({ page: 1, limit: 12 });
    const hit = buscarClaveProhibida(res);
    expect(hit).toBeNull();
  });

  it('getProductoDetalle no expone ninguna clave sensible', async () => {
    const res = await service.getProductoDetalle('p1');
    const hit = buscarClaveProhibida(res);
    expect(hit).toBeNull();
  });

  it('getProductoDetalle sí expone el estado cualitativo (stockStatus/disponible)', async () => {
    const res: any = await service.getProductoDetalle('p1');
    expect(res.variantes[0]).toHaveProperty('stockStatus');
    expect(res.variantes[0]).toHaveProperty('disponible');
    // Confirmación explícita: la cantidad exacta no viaja.
    expect(res.variantes[0]).not.toHaveProperty('stockRestante');
  });
});
