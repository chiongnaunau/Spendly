'use client';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { AuthLandingView } from '@/components/auth/AuthLandingView';
import { AuthModal } from '@/components/auth/AuthModal';

export function AppShellWrapper({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  // 1. Initial authentication loading state
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08090c',
          color: '#ffffff',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #4271d5, #1e3a8a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            boxShadow: '0 8px 24px rgba(66, 113, 213, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            animation: 'pulse 1.8s infinite',
          }}
        >
          💸
        </div>
        <div style={{ fontSize: 14, color: '#8a8a87', fontWeight: 500 }}>
          Đang khởi tạo Spendly...
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.08);
              opacity: 0.85;
            }
          }
        `}</style>
      </div>
    );
  }

  // 2. Unauthenticated: Show the dedicated Avenue Z styled Auth Landing page
  if (!user) {
    return (
      <>
        <AuthLandingView />
        <AuthModal />
      </>
    );
  }

  // 3. Authenticated: Render full application workspace with Avenue Z ambient depth
  return (
    <div className="app-shell animate-in">
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />
      <Sidebar />
      <main className="main-content">{children}</main>
      <AuthModal />
    </div>
  );
}

