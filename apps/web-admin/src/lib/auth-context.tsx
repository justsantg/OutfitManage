'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UsuarioAuth, AuthResponse } from '../types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: UsuarioAuth | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { nombre: string; email: string; password: string; rol?: string }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UsuarioAuth | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Restaurar sesión desde localStorage al cargar
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('tienda360_token');
      const storedUser = localStorage.getItem('tienda360_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Error restaurando sesión:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }

    const data: AuthResponse = await res.json();
    setToken(data.accessToken);
    setUser(data.user);

    localStorage.setItem('tienda360_token', data.accessToken);
    localStorage.setItem('tienda360_user', JSON.stringify(data.user));
    if (data.refreshToken) localStorage.setItem('tienda360_refresh', data.refreshToken);

    router.push('/');
  };

  const register = async (data: { nombre: string; email: string; password: string; rol?: string }) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Error al registrar usuario');
    }

    const authData: AuthResponse = await res.json();
    setToken(authData.accessToken);
    setUser(authData.user);

    localStorage.setItem('tienda360_token', authData.accessToken);
    localStorage.setItem('tienda360_user', JSON.stringify(authData.user));
    if (authData.refreshToken) localStorage.setItem('tienda360_refresh', authData.refreshToken);

    router.push('/');
  };

  const logout = () => {
    // Revoca la familia de refresh tokens en el servidor (best-effort: si falla la red, la
    // sesión local igual se cierra y el access token expira solo).
    const refreshToken = localStorage.getItem('tienda360_refresh');
    if (refreshToken && token) {
      void fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('tienda360_token');
    localStorage.removeItem('tienda360_user');
    localStorage.removeItem('tienda360_refresh');
    router.push('/login');
  };

  const isAdmin = user?.rol === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
