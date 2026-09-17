export type RolUsuario = 'ADMIN' | 'VENDEDOR' | 'BODEGA';

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
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
  descripcion?: string | null;
  categoriaPadreId?: string | null;
  subcategorias?: Categoria[];
}

export interface Ubicacion {
  id: string;
  nombre: string;
  tipo: 'BODEGA' | 'TIENDA';
  direccion?: string | null;
  activo: boolean;
}

export interface VarianteSku {
  id: string;
  productoId: string;
  skuCode: string;
  talla: string;
  color: string;
  atributoOpcional?: string | null;
  barcode?: string | null;
  activo: boolean;
  precios?: {
    precio: number;
    vigenteDesde: string;
    vigenteHasta?: string | null;
  }[];
  saldos?: {
    cantidad: number;
    ubicacionId: string;
    ubicacion: Ubicacion;
  }[];
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
  };
  visiblePublico: boolean;
  createdAt: string;
  variantes: VarianteSku[];
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO' | 'DEVOLUCION';

export interface MovimientoInventario {
  id: string;
  varianteId: string;
  ubicacionId: string;
  ubicacionDestinoId?: string | null;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo?: string | null;
  usuarioId: string;
  idempotencyKey: string;
  timestamp: string;
  variante: {
    id?: string;
    skuCode: string;
    talla: string;
    color: string;
    producto: {
      id?: string;
      nombre: string;
    };
  };
  ubicacion: {
    id?: string;
    nombre: string;
    tipo: string;
  };
  ubicacionDestino?: {
    id?: string;
    nombre: string;
  } | null;
  usuario: {
    id?: string;
    nombre: string;
    email?: string;
    rol: string;
  };
}

export interface DashboardStats {
  totalProductos: number;
  totalVariantes: number;
  totalUbicaciones: number;
  totalMovimientos: number;
  stockTotal: number;
  resumenUbicaciones: {
    id: string;
    nombre: string;
    tipo: string;
    stockTotal: number;
  }[];
  ultimosMovimientos: MovimientoInventario[];
}
