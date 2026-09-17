import { v4 as uuidv4 } from 'uuid';
import {
  DashboardStats,
  Producto,
  Ubicacion,
  Categoria,
  MovimientoInventario,
  TipoMovimiento,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const ACCESS_KEY = 'tienda360_token';
const REFRESH_KEY = 'tienda360_refresh';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem('tienda360_user');
  localStorage.removeItem(REFRESH_KEY);
}

// Renueva el access token con el refresh token almacenado (rotación server-side). Devuelve el
// nuevo access token o null si la renovación falla. Se serializa en una sola promesa para que
// varias peticiones que reciben 401 a la vez no disparen múltiples rotaciones en paralelo.
let refreshInFlight: Promise<string | null> | null = null;
async function refreshTokens(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem(ACCESS_KEY, data.accessToken);
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
        if (data.user) localStorage.setItem('tienda360_user', JSON.stringify(data.user));
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

// fetch con Authorization y renovación transparente: ante un 401, intenta rotar el token una vez
// y reintenta la petición original con el token nuevo.
async function authedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const withAuth: RequestInit = {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  let res = await fetch(input, withAuth);
  if (res.status !== 401) return res;

  const nuevoToken = await refreshTokens();
  if (!nuevoToken) return res;

  res = await fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${nuevoToken}` },
  });
  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // La renovación ya se intentó en authedFetch; si seguimos en 401, la sesión terminó.
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada o no autorizada');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const msg = errorBody?.message
      ? Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : errorBody.message
      : res.statusText;
    throw new Error(msg || 'Error en la petición al servidor');
  }

  return await res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await authedFetch(`${API_BASE_URL}/api/inventario/dashboard/stats`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<DashboardStats>(res);
  },

  // Productos
  getProductos: async (page = 1, limit = 20): Promise<{ items: Producto[]; meta: any }> => {
    const res = await authedFetch(`${API_BASE_URL}/api/productos?page=${page}&limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  createProducto: async (data: {
    nombre: string;
    descripcion?: string;
    categoriaId: string;
    visiblePublico?: boolean;
    variantes: {
      skuCode: string;
      talla: string;
      color: string;
      atributoOpcional?: string;
      barcode?: string;
      precio: number;
    }[];
  }): Promise<Producto> => {
    const res = await authedFetch(`${API_BASE_URL}/api/productos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Producto>(res);
  },

  updateProducto: async (
    id: string,
    data: {
      nombre?: string;
      descripcion?: string;
      categoriaId?: string;
      visiblePublico?: boolean;
      variantes?: {
        id?: string;
        skuCode: string;
        talla: string;
        color: string;
        atributoOpcional?: string;
        barcode?: string;
        precio?: number;
        activo?: boolean;
      }[];
    }
  ): Promise<Producto> => {
    const res = await authedFetch(`${API_BASE_URL}/api/productos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Producto>(res);
  },

  deleteProducto: async (id: string): Promise<any> => {
    const res = await authedFetch(`${API_BASE_URL}/api/productos/${id}`, {
      method: 'DELETE',
      headers: {
      },
    });
    return handleResponse(res);
  },

  // Ubicaciones
  getUbicaciones: async (): Promise<Ubicacion[]> => {
    const res = await authedFetch(`${API_BASE_URL}/api/ubicaciones`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<Ubicacion[]>(res);
  },

  createUbicacion: async (data: {
    nombre: string;
    tipo: 'BODEGA' | 'TIENDA';
    direccion?: string;
  }): Promise<Ubicacion> => {
    const res = await authedFetch(`${API_BASE_URL}/api/ubicaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Ubicacion>(res);
  },

  // Categorías
  getCategorias: async (): Promise<Categoria[]> => {
    const res = await authedFetch(`${API_BASE_URL}/api/categorias`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<Categoria[]>(res);
  },

  createCategoria: async (data: {
    nombre: string;
    descripcion?: string;
    categoriaPadreId?: string;
  }): Promise<Categoria> => {
    const res = await authedFetch(`${API_BASE_URL}/api/categorias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Categoria>(res);
  },

  // Inventario & Movimientos (con Idempotency-Key automática)
  createMovimiento: async (data: {
    varianteId: string;
    ubicacionId: string;
    ubicacionDestinoId?: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo?: string;
  }): Promise<{ movimiento: MovimientoInventario; deduplicated: boolean }> => {
    const idempotencyKey = uuidv4();
    const res = await authedFetch(`${API_BASE_URL}/api/inventario/movimientos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getMovimientos: async (page = 1, limit = 20): Promise<{ items: MovimientoInventario[]; meta: any }> => {
    const res = await authedFetch(`${API_BASE_URL}/api/inventario/movimientos?page=${page}&limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  getStock: async (query: { varianteId?: string; sku?: string; ubicacionId?: string }) => {
    const params = new URLSearchParams();
    if (query.varianteId) params.append('varianteId', query.varianteId);
    if (query.sku) params.append('sku', query.sku);
    if (query.ubicacionId) params.append('ubicacionId', query.ubicacionId);

    const res = await authedFetch(`${API_BASE_URL}/api/inventario/stock?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<any>(res);
  },
};
