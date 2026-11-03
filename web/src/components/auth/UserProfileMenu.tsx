'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { LogIn, LogOut, CheckCircle, Link2 } from 'lucide-react';
import Image from 'next/image';

export function UserProfileMenu() {
  const { user, openAuthModal, logout, linkGoogleAccount } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div style={{ padding: '0 10px', marginBottom: 12 }}>
        <button
          className="btn btn-primary"
          onClick={() => openAuthModal('login')}
          style={{
            width: '100%',
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
          }}
        >
          <LogIn size={15} />
          <span>{t('auth.loginTab')}</span>
        </button>
      </div>
    );
  }

  const initial = (user.full_name || user.email || 'U')[0].toUpperCase();

  async function handleLinkGoogle() {
    setLinkError('');
    setLinkSuccess('');
    if (!googleClientId) {
      setLinkError('Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (res) => {
            if (res.credential) {
              try {
                await linkGoogleAccount(res.credential);
                setLinkSuccess('Liên kết Google thành công!');
              } catch (err) {
                setLinkError(err instanceof Error ? err.message : 'Liên kết Google thất bại');
              }
            }
          },
        });
        window.google.accounts.id.prompt();
      }
    } catch {
      setLinkError('Lỗi kết nối dịch vụ Google');
    }
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', padding: '0 10px', marginBottom: 12 }}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.full_name || user.email}
            width={30}
            height={30}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {initial}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.full_name || user.email.split('@')[0]}
          </div>
          <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="card animate-in"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 10,
            right: 10,
            marginBottom: 8,
            padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 100,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-color)', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name || t('auth.userDefaultName')}</div>
            <div className="text-muted text-xs">{user.email}</div>
          </div>

          {/* Google Link Status */}
          <div style={{ marginBottom: 10 }}>
            {user.has_google_linked ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--success)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '6px 8px',
                  borderRadius: 6,
                }}
              >
                <CheckCircle size={14} />
                <span>{t('auth.googleLinked')}</span>
              </div>
            ) : (
              <div>
                <button
                  onClick={handleLinkGoogle}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <Link2 size={13} />
                  <span>{t('auth.linkGoogle')}</span>
                </button>
                {linkError && <div style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{linkError}</div>}
                {linkSuccess && <div style={{ color: 'var(--success)', fontSize: 11, marginTop: 4 }}>{linkSuccess}</div>}
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--error)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
