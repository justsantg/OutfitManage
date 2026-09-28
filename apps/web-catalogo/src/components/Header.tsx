'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import { getWhatsAppUrl } from '../lib/constants';
import {
  Sparkles,
  MessageCircle,
  User,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';

export default function Header() {
  const storeName = process.env.NEXT_PUBLIC_TIENDA_NOMBRE || 'OutfitManage';
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo y Branding */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 p-[2px] shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                {storeName}
              </span>
              <span className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                Vitrina Virtual & Inventario
              </span>
            </div>
          </Link>

          {/* Acciones de Cabecera: Tema / Usuario / Admin / WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {user.rol === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-all shadow-sm"
                    title="Ir al Panel de Administración"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Panel Admin</span>
                  </Link>
                )}

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold max-w-[100px] truncate">{user.nombre}</span>
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </Link>
            )}

            {/* WhatsApp Directo */}
            <a
              href={getWhatsAppUrl('¡Hola! Me gustaría hacer una consulta sobre los productos de su catálogo.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all duration-200"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-400/20" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
