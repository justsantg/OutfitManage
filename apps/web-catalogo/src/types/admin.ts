export type UserRole = 'ADMIN' | 'VENDEDOR' | 'BODEGA' | 'CLIENTE';

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo?: boolean;
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    movimientos: number;
  };
}

export interface UsuariosResponse {
  items: UsuarioAdmin[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalUsuarios: number;
    totalAdmins: number;
    totalClientes: number;
    totalStaff: number;
  };
}

export interface AuthResponse {
  user: UsuarioAuth;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  categoriaPadreId?: string;
  activo?: boolean;
  subcategorias?: Categoria[];
}

export interface Ubicacion {
  id: string;
  nombre: string;
  tipo: 'BODEGA' | 'TIENDA';
  direccion?: string;
  activo?: boolean;
}

export interface PrecioHistorico {
  id: string;
  varianteId: string;
  precio: number | string;
  vigenteDesde: string;
  vigenteHasta?: string | null;
}

export interface SaldoUbicacion {
  ubicacionId: string;
  cantidad: number;
  ubicacion: {
    id: string;
    nombre: string;
    tipo: string;
  };
}

export interface VarianteSku {
  id: string;
  productoId: string;
  skuCode: string;
  talla: string;
  color: string;
  imagenUrl?: string;
  imagenes?: ImagenProducto[];
  atributoOpcional?: string;
  barcode?: string;
  activo?: boolean;
  precios?: PrecioHistorico[];
  saldos?: SaldoUbicacion[];
}

export interface ImagenProducto {
  id: string;
  urlStorage: string;
  tipo?: 'IMAGE' | 'VIDEO';
  orden: number;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  visiblePublico: boolean;
  createdAt: string;
  updatedAt: string;
  categoria?: Categoria;
  imagenes?: ImagenProducto[];
  variantes?: VarianteSku[];
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO' | 'DEVOLUCION';

export interface MovimientoInventario {
  id: string;
  varianteId: string;
  ubicacionId: string;
  ubicacionDestinoId?: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo?: string;
  usuarioId: string;
  idempotencyKey: string;
  timestamp: string;
  deduplicated?: boolean;
  variante?: {
    skuCode: string;
    talla: string;
    color: string;
    producto?: {
      nombre: string;
    };
  };
  ubicacion?: {
    nombre: string;
    tipo: string;
  };
  ubicacionDestino?: {
    nombre: string;
    tipo: string;
  };
  usuario?: {
    nombre: string;
    email: string;
    rol: string;
  };
}

export interface DashboardStats {
  totalProductos: number;
  totalVariantes: number;
  stockConsolidado: number;
  totalMovimientos: number;
  distribucionUbicaciones: {
    id: string;
    nombre: string;
    tipo: string;
    totalStock: number;
  }[];
  ultimosMovimientos: MovimientoInventario[];
}
