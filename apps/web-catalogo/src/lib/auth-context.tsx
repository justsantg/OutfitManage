'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UsuarioAuth, AuthResponse } from '../types/admin';
import { useRouter } from 'next/navigation';
import { getPrivateApiUrl } from './api';

interface AuthContextType {
  user: UsuarioAuth | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<UsuarioAuth>;
  register: (data: { nombre: string; email: string; password: string; rol?: string }) => Promise<UsuarioAuth>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UsuarioAuth | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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

  const login = async (credentials: { email: string; password: string }): Promise<UsuarioAuth> => {
    const res = await fetch(getPrivateApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Credenciales inválidas. Por favor verifica tu correo y contraseña.');
    }

    const data: AuthResponse = await res.json();
    setToken(data.accessToken);
    setUser(data.user);

    localStorage.setItem('tienda360_token', data.accessToken);
    localStorage.setItem('tienda360_user', JSON.stringify(data.user));
    if (data.refreshToken) {
      localStorage.setItem('tienda360_refresh', data.refreshToken);
    }

    // Redirección inteligente por rol
    if (data.user.rol === 'ADMIN') {
      router.push('/admin');
    } else if (data.user.rol === 'VENDEDOR') {
      router.push('/admin/ventas');
    } else if (data.user.rol === 'BODEGA') {
      router.push('/admin/inventario');
    } else {
      router.push('/');
    }

    return data.user;
  };

  const register = async (formData: { nombre: string; email: string; password: string; rol?: string }): Promise<UsuarioAuth> => {
    const res = await fetch(getPrivateApiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(error?.message || 'Error al crear la cuenta');
    }

    const authData: AuthResponse = await res.json();
    setToken(authData.accessToken);
    setUser(authData.user);

    localStorage.setItem('tienda360_token', authData.accessToken);
    localStorage.setItem('tienda360_user', JSON.stringify(authData.user));
    if (authData.refreshToken) {
      localStorage.setItem('tienda360_refresh', authData.refreshToken);
    }

    // Redirección inteligente por rol
    if (authData.user.rol === 'ADMIN') {
      router.push('/admin');
    } else if (authData.user.rol === 'VENDEDOR') {
      router.push('/admin/ventas');
    } else if (authData.user.rol === 'BODEGA') {
      router.push('/admin/inventario');
    } else {
      router.push('/');
    }

    return authData.user;
  };

  const logout = () => {
    // Revoca la familia de refresh tokens en el servidor (SRS §5)
    const refreshToken = localStorage.getItem('tienda360_refresh');
    const currentToken = token || localStorage.getItem('tienda360_token');

    if (refreshToken && currentToken) {
      void fetch(getPrivateApiUrl('/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // Best-effort: si falla la red, la sesión local se cierra igual
      });
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('tienda360_token');
    localStorage.removeItem('tienda360_user');
    localStorage.removeItem('tienda360_refresh');

    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.push('/');
    }
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
