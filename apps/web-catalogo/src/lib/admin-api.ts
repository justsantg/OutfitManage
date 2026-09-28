import {
  Producto,
  Ubicacion,
  Categoria,
  MovimientoInventario,
  TipoMovimiento,
  DashboardStats,
  UsuarioAdmin,
  UsuariosResponse,
} from '../types/admin';
import { getPrivateApiUrl } from './api';

const API_ROOT = getPrivateApiUrl('');
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

let refreshInFlight: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(getPrivateApiUrl('/auth/refresh'), {
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

export async function authedFetch(
  input: string,
  init: RequestInit = {}
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
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${nuevoToken}`,
    },
  });
  return res;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada o no autorizada');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    let message = 'Ocurrió un error inesperado';
    if (Array.isArray(errorData?.message)) {
      message = errorData.message.join(', ');
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (errorData?.error && typeof errorData.error === 'string') {
      message = errorData.error;
    } else {
      message = `Error ${res.status}: ${res.statusText}`;
    }

    const err: any = new Error(message);
    err.data = errorData;
    err.status = res.status;
    err.code = errorData?.error;
    err.disponible = errorData?.disponible;
    err.solicitado = errorData?.solicitado;
    throw err;
  }
  return await res.json();
}

export const adminApi = {
  // Storage & Media
  uploadMedia: async (
    file: File,
    folder?: string
  ): Promise<{
    bucket: string;
    path: string;
    signedUrl: string;
    tipo: 'IMAGE' | 'VIDEO';
    originalName: string;
    size: number;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const res = await authedFetch(`${API_ROOT}/storage/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  deleteMediaFile: async (bucket: string, path: string): Promise<{ success: boolean }> => {
    const res = await authedFetch(`${API_ROOT}/storage/file`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucket, path }),
    });
    return handleResponse(res);
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await authedFetch(`${API_ROOT}/inventario/dashboard/stats`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<DashboardStats>(res);
  },

  // Productos
  getProductos: async (page = 1, limit = 50): Promise<{ items: Producto[]; meta: any }> => {
    const res = await authedFetch(`${API_ROOT}/productos?page=${page}&limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  createProducto: async (data: {
    nombre: string;
    descripcion?: string;
    categoriaId: string;
    visiblePublico?: boolean;
    imagenes?: string[];
    variantes: {
      skuCode: string;
      talla: string;
      color: string;
      atributoOpcional?: string;
      precio: number;
      ubicacionId?: string;
      cantidadInicial?: number;
      imagenes?: ({ url: string; tipo: 'IMAGE' | 'VIDEO'; orden?: number } | string)[];
    }[];
  }): Promise<Producto> => {
    const normalizedData = {
      ...data,
      variantes: data.variantes.map((v) => ({
        ...v,
        imagenes: v.imagenes?.map((img, idx) =>
          typeof img === 'string'
            ? { url: img, tipo: 'IMAGE' as const, orden: idx }
            : img
        ),
      })),
    };

    const res = await authedFetch(`${API_ROOT}/productos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedData),
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
      imagenes?: string[];
      variantes?: {
        id?: string;
        skuCode: string;
        talla: string;
        color: string;
        atributoOpcional?: string;
        precio?: number;
        imagenes?: ({ url: string; tipo: 'IMAGE' | 'VIDEO'; orden?: number } | string)[];
      }[];
    }
  ): Promise<Producto> => {
    const normalizedData = {
      ...data,
      variantes: data.variantes?.map((v) => ({
        ...v,
        imagenes: v.imagenes?.map((img, idx) =>
          typeof img === 'string'
            ? { url: img, tipo: 'IMAGE' as const, orden: idx }
            : img
        ),
      })),
    };

    const res = await authedFetch(`${API_ROOT}/productos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedData),
    });
    return handleResponse<Producto>(res);
  },

  deleteProducto: async (id: string): Promise<{ message: string }> => {
    const res = await authedFetch(`${API_ROOT}/productos/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Ubicaciones
  getUbicaciones: async (): Promise<Ubicacion[]> => {
    const res = await authedFetch(`${API_ROOT}/ubicaciones`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<Ubicacion[]>(res);
  },

  createUbicacion: async (data: {
    codigo?: string;
    nombre: string;
    tipo: 'BODEGA' | 'TIENDA';
    direccion?: string;
    activa?: boolean;
  }): Promise<Ubicacion> => {
    const payload = {
      ...data,
      codigo: data.codigo || `UBI-${Date.now().toString(36).toUpperCase()}`,
    };
    const res = await authedFetch(`${API_ROOT}/ubicaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Ubicacion>(res);
  },

  updateUbicacion: async (
    id: string,
    data: {
      codigo?: string;
      nombre?: string;
      tipo?: 'BODEGA' | 'TIENDA';
      direccion?: string;
      activa?: boolean;
    }
  ): Promise<Ubicacion> => {
    const res = await authedFetch(`${API_ROOT}/ubicaciones/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Ubicacion>(res);
  },

  deleteUbicacion: async (id: string): Promise<{ message: string }> => {
    const res = await authedFetch(`${API_ROOT}/ubicaciones/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Categorías
  getCategorias: async (): Promise<Categoria[]> => {
    const res = await authedFetch(`${API_ROOT}/categorias`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<Categoria[]>(res);
  },

  createCategoria: async (data: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    categoriaPadreId?: string;
    activa?: boolean;
  }): Promise<Categoria> => {
    const payload = {
      ...data,
      codigo: data.codigo || `CAT-${Date.now().toString(36).toUpperCase()}`,
    };
    const res = await authedFetch(`${API_ROOT}/categorias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Categoria>(res);
  },

  updateCategoria: async (
    id: string,
    data: {
      codigo?: string;
      nombre?: string;
      descripcion?: string;
      activa?: boolean;
    }
  ): Promise<Categoria> => {
    const res = await authedFetch(`${API_ROOT}/categorias/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Categoria>(res);
  },

  deleteCategoria: async (id: string): Promise<{ message: string }> => {
    const res = await authedFetch(`${API_ROOT}/categorias/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Inventario & Movimientos
  getMovimientos: async (
    page = 1,
    limit = 50,
    searchParams?: string | { productoId?: string; ubicacionId?: string; tipo?: string }
  ): Promise<{ items: MovimientoInventario[]; meta: any }> => {
    let q = '';
    if (typeof searchParams === 'string') {
      q = `&tipo=${encodeURIComponent(searchParams)}`;
    } else if (searchParams && typeof searchParams === 'object') {
      q = `&${new URLSearchParams(searchParams as any).toString()}`;
    }

    const res = await authedFetch(`${API_ROOT}/inventario/movimientos?page=${page}&limit=${limit}${q}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  buscarInventario: async (searchParams: {
    q?: string;
    ubicacionId?: string;
    categoriaId?: string;
    talla?: string;
    color?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; meta: any }> => {
    const params = new URLSearchParams();
    if (searchParams.q) params.append('q', searchParams.q);
    if (searchParams.ubicacionId) params.append('ubicacionId', searchParams.ubicacionId);
    if (searchParams.categoriaId) params.append('categoriaId', searchParams.categoriaId);
    if (searchParams.talla) params.append('talla', searchParams.talla);
    if (searchParams.color) params.append('color', searchParams.color);
    if (searchParams.page) params.append('page', searchParams.page.toString());
    if (searchParams.limit) params.append('limit', searchParams.limit.toString());

    const res = await authedFetch(`${API_ROOT}/inventario/buscar?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  buscarStockRapido: async (
    q?: string,
    categoriaId?: string,
    ubicacionId?: string
  ): Promise<{ items: any[]; meta: any }> => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (ubicacionId) params.append('ubicacionId', ubicacionId);
    params.append('limit', '100');

    const res = await authedFetch(`${API_ROOT}/inventario/buscar?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  registrarMovimiento: async (data: {
    varianteId: string;
    ubicacionId?: string;
    ubicacionOrigenId?: string;
    ubicacionDestinoId?: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo?: string;
    idempotencyKey?: string;
  }): Promise<MovimientoInventario> => {
    const payload = {
      ...data,
      ubicacionId: data.ubicacionId || data.ubicacionOrigenId,
      ubicacionOrigenId: data.ubicacionOrigenId || data.ubicacionId,
      idempotencyKey: data.idempotencyKey || generateIdempotencyKey(),
    };

    const res = await authedFetch(`${API_ROOT}/inventario/movimientos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<MovimientoInventario>(res);
  },

  // Alias para retrocompatibilidad
  createMovimiento: async (data: {
    varianteId: string;
    ubicacionId?: string;
    ubicacionOrigenId?: string;
    ubicacionDestinoId?: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo?: string;
    idempotencyKey?: string;
  }): Promise<MovimientoInventario> => {
    return adminApi.registrarMovimiento(data);
  },

  // Usuarios
  getUsuarios: async (
    pageOrQuery?: number | { search?: string; rol?: string; page?: number; limit?: number },
    limitParam = 20,
    searchParam?: string,
    rolParam?: string
  ): Promise<UsuariosResponse> => {
    const query = new URLSearchParams();

    if (typeof pageOrQuery === 'object' && pageOrQuery !== null) {
      if (pageOrQuery.page) query.append('page', pageOrQuery.page.toString());
      if (pageOrQuery.limit) query.append('limit', pageOrQuery.limit.toString());
      if (pageOrQuery.search) query.append('search', pageOrQuery.search);
      if (pageOrQuery.rol) query.append('rol', pageOrQuery.rol);
    } else {
      const page = typeof pageOrQuery === 'number' ? pageOrQuery : 1;
      query.append('page', page.toString());
      query.append('limit', limitParam.toString());
      if (searchParam) query.append('search', searchParam);
      if (rolParam) query.append('rol', rolParam);
    }

    const res = await authedFetch(`${API_ROOT}/usuarios?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<UsuariosResponse>(res);
  },

  createUsuario: async (data: {
    nombre: string;
    email: string;
    password: string;
    rol?: string;
    activo?: boolean;
  }): Promise<UsuarioAdmin> => {
    const res = await authedFetch(`${API_ROOT}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<UsuarioAdmin>(res);
  },

  updateUsuario: async (
    id: string,
    data: {
      nombre?: string;
      email?: string;
      password?: string;
      rol?: string;
      activo?: boolean;
    }
  ): Promise<UsuarioAdmin> => {
    const res = await authedFetch(`${API_ROOT}/usuarios/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<UsuarioAdmin>(res);
  },

  toggleUsuarioActivo: async (id: string): Promise<UsuarioAdmin> => {
    const res = await authedFetch(`${API_ROOT}/usuarios/${id}/toggle-activo`, {
      method: 'PATCH',
    });
    return handleResponse<UsuarioAdmin>(res);
  },

  deleteUsuario: async (id: string): Promise<{ message: string }> => {
    const res = await authedFetch(`${API_ROOT}/usuarios/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

export default adminApi;
