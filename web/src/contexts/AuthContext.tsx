'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { getMe, login as apiLogin, register as apiRegister, loginWithGoogle as apiGoogleLogin, linkGoogleAccount as apiGoogleLink } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  linkGoogleAccount: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('spendly_token') : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('spendly_token'));
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spendly_token');
    }
    setToken(null);
    setUser(null);
  }, []);

  // Fetch current user if token exists on load
  useEffect(() => {
    if (!token) return;

    let ignore = false;
    getMe()
      .then((userData) => {
        if (!ignore) {
          setUser(userData);
        }
      })
      .catch(() => {
        if (!ignore) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('spendly_token');
          }
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    if (typeof window !== 'undefined') {
      localStorage.setItem('spendly_token', res.access_token);
    }
    setToken(res.access_token);
    setUser(res.user);
    setIsAuthModalOpen(false);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res = await apiRegister({ email, password, full_name: fullName });
    if (typeof window !== 'undefined') {
      localStorage.setItem('spendly_token', res.access_token);
    }
    setToken(res.access_token);
    setUser(res.user);
    setIsAuthModalOpen(false);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await apiGoogleLogin(credential);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spendly_token', res.access_token);
    }
    setToken(res.access_token);
    setUser(res.user);
    setIsAuthModalOpen(false);
  }, []);

  const linkGoogleAccount = useCallback(async (credential: string) => {
    const updatedUser = await apiGoogleLink(credential);
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        loginWithGoogle,
        linkGoogleAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
