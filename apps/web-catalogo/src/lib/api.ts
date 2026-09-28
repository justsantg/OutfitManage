import { CatalogoResponse, CategoriaPublica, ProductoDetallePublico } from '../types/catalogo';

export function getPublicApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `/backend-public${path.startsWith('/') ? path : `/${path}`}`;
  }
  const base = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${base}/public${path.startsWith('/') ? path : `/${path}`}`;
}

export function getPrivateApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `/backend-api${path.startsWith('/') ? path : `/${path}`}`;
  }
  const base = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${base}/api${path.startsWith('/') ? path : `/${path}`}`;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

export async function fetchCatalogo(params?: {
  categoria?: string;
  talla?: string;
  color?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<CatalogoResponse> {
  const query = new URLSearchParams();
  if (params?.categoria) query.append('categoria', params.categoria);
  if (params?.talla) query.append('talla', params.talla);
  if (params?.color) query.append('color', params.color);
  if (params?.q) query.append('q', params.q);
  if (params?.page) query.append('page', params.page.toString());
  const safeLimit = Math.min(params?.limit ?? 48, 48);
  query.append('limit', safeLimit.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const url = getPublicApiUrl(`/catalogo${queryString}`);
  
  try {
    const fetchOptions: RequestInit = {
      headers: {
        'Accept': 'application/json',
      },
    };
    if (typeof window === 'undefined') {
      (fetchOptions as any).next = { revalidate: 30 };
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const msg = errorBody?.message ? (Array.isArray(errorBody.message) ? errorBody.message.join(', ') : errorBody.message) : res.statusText;
      throw new Error(`Error (${res.status}): ${msg}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching catálogo:', error);
    return {
      items: [],
      meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
    };
  }
}

export async function fetchCategorias(): Promise<CategoriaPublica[]> {
  const url = getPublicApiUrl('/categorias');
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching categorías:', error);
    return [];
  }
}

export async function fetchProductoDetalle(id: string): Promise<ProductoDetallePublico | null> {
  const url = getPublicApiUrl(`/productos/${id}`);
  try {
    const res = await fetch(url, {
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`Error fetching producto ${id}:`, error);
    return null;
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'Consultar precio';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
