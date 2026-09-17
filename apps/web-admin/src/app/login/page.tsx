'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { useToast } from '../../lib/toast-context';
import { Sparkles, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

const CATALOGO_URL = process.env.NEXT_PUBLIC_CATALOGO_URL || 'http://localhost:3001';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      toast.success('Sesión iniciada con éxito. ¡Bienvenido al panel!', 'Acceso Autorizado');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#090d16] relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* Acceso a Tienda Virtual */}
        <div className="flex justify-center">
          <a
            href={CATALOGO_URL}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-slate-900/80 text-sky-400 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-800 transition-all shadow-lg"
          >
            <span>🛍️ Ir a la Tienda Virtual (Catálogo Público)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 p-[2px] mx-auto shadow-xl shadow-sky-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sky-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tienda360 Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Gestor de Inventario & Panel de Administración
          </p>
        </div>

        {/* Tarjeta de Login */}
        <div className="p-8 rounded-3xl glass-card border-slate-800 space-y-6 shadow-2xl">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tienda360.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-900/90 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-900/90 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-600 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Link a Registro */}
        <p className="text-center text-xs text-slate-400">
          ¿No tienes una cuenta aún?{' '}
          <Link href="/register" className="font-bold text-sky-400 hover:text-sky-300 underline">
            Registrar nuevo usuario
          </Link>
        </p>
      </div>
    </div>
  );
}
