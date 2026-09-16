'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { Loader2, ShieldAlert } from 'lucide-react';

const STAFF_ROLES = ['ADMIN', 'BODEGA', 'VENDEDOR'];

// Allowed routes map per role
const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  VENDEDOR: ['/admin/ventas', '/admin/inventario', '/admin/stock'],
  BODEGA: ['/admin/inventario', '/admin/stock', '/admin/configuracion'],
  ADMIN: [
    '/admin',
    '/admin/ventas',
    '/admin/productos',
    '/admin/inventario',
    '/admin/stock',
    '/admin/usuarios',
    '/admin/configuracion',
  ],
};

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!isLoading) {
      if (!token && !isAuthRoute) {
        router.replace('/login');
        return;
      }

      if (token && user) {
        // If user is not staff, redirect to public catalog
        if (!STAFF_ROLES.includes(user.rol)) {
          router.replace('/');
          return;
        }

        // If VENDEDOR visits /admin root, redirect to /admin/ventas
        if (user.rol === 'VENDEDOR' && pathname === '/admin') {
          router.replace('/admin/ventas');
          return;
        }

        // If BODEGA visits /admin root, redirect to /admin/inventario
        if (user.rol === 'BODEGA' && pathname === '/admin') {
          router.replace('/admin/inventario');
          return;
        }

        // Check if current route is allowed for the role
        const allowed = ROLE_ALLOWED_ROUTES[user.rol] || [];
        const isRouteAllowed = allowed.some((route) =>
          route === '/admin' ? pathname === '/admin' : pathname.startsWith(route)
        );

        if (!isRouteAllowed && pathname.startsWith('/admin')) {
          // Redirect to the default landing page for their role
          if (user.rol === 'VENDEDOR') {
            router.replace('/admin/ventas');
          } else if (user.rol === 'BODEGA') {
            router.replace('/admin/inventario');
          } else {
            router.replace('/admin');
          }
        }
      }
    }
  }, [token, user, isLoading, isAuthRoute, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07090e] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400 mb-4" />
        <span className="text-xs uppercase tracking-widest font-bold font-mono">
          Verificando Credenciales y Rol...
        </span>
      </div>
    );
  }

  // Allow public auth routes
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // If not authenticated, render nothing while redirecting
  if (!token || !user) {
    return null;
  }

  // If not staff role (e.g. regular CLIENTE)
  if (!STAFF_ROLES.includes(user.rol)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07090e] text-slate-300 p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-sm">
          Tu cuenta ({user.email}) tiene rol de <strong className="text-white">{user.rol}</strong> y no cuenta con permisos para acceder a los módulos internos.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
        >
          Ir a la Tienda Virtual
        </button>
      </div>
    );
  }

  // Check specific route permissions
  const allowed = ROLE_ALLOWED_ROUTES[user.rol] || [];
  const isRouteAllowed = allowed.some((route) =>
    route === '/admin' ? pathname === '/admin' : pathname.startsWith(route)
  );

  if (!isRouteAllowed && pathname.startsWith('/admin')) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Módulo No Autorizado
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
          El rol <strong className="text-slate-900 dark:text-white font-mono">{user.rol}</strong> no tiene permisos para acceder a esta sección.
        </p>
        <button
          onClick={() => {
            if (user.rol === 'VENDEDOR') router.push('/admin/ventas');
            else if (user.rol === 'BODEGA') router.push('/admin/inventario');
            else router.push('/admin');
          }}
          className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all"
        >
          Volver a mi módulo principal
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
