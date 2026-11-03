'use client';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { X, Mail, Lock, User as UserIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; width?: number; text?: string; shape?: string }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalTab, openAuthModal, login, register, loginWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  function switchTab(tab: 'login' | 'register') {
    setError('');
    setSuccess('');
    openAuthModal(tab);
  }

  // Initialize Google Identity Services button
  useEffect(() => {
    if (!isAuthModalOpen || !googleScriptLoaded || !googleBtnRef.current || !googleClientId) return;

    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response.credential) {
              setIsSubmitting(true);
              setError('');
              try {
                await loginWithGoogle(response.credential);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
              } finally {
                setIsSubmitting(false);
              }
            }
          },
        });

        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: authModalTab === 'login' ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
        });
      }
    } catch (e) {
      console.warn('Google Identity initialization notice:', e);
    }
  }, [isAuthModalOpen, googleScriptLoaded, googleClientId, authModalTab, loginWithGoogle]);

  if (!isAuthModalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email và mật khẩu');
      return;
    }

    if (authModalTab === 'register') {
      if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu nhập lại không khớp');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authModalTab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác không thành công');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleFallbackClick() {
    if (!googleClientId) {
      setError('Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID trong file môi trường. Vui lòng thêm Google Client ID vào .env.');
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptLoaded(true)}
      />

      <div className="modal-backdrop animate-in" onClick={closeAuthModal} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 420, width: '92%', padding: '28px 24px', borderRadius: 16 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {authModalTab === 'login' ? 'Đăng nhập Spendly' : 'Tạo tài khoản mới'}
              </div>
              <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                {authModalTab === 'login'
                  ? 'Quản lý tài chính cá nhân thông minh cùng Spendly AI'
                  : 'Bắt đầu theo dõi thu chi và ngân sách miễn phí'}
              </div>
            </div>
            <button className="btn-icon" onClick={closeAuthModal} style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}>
              <X size={18} />
            </button>
          </div>

          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface-2)',
              padding: 3,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              onClick={() => switchTab('login')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: authModalTab === 'login' ? 'var(--bg-surface)' : 'transparent',
                color: authModalTab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: authModalTab === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: authModalTab === 'register' ? 'var(--bg-surface)' : 'transparent',
                color: authModalTab === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: authModalTab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Đăng ký
            </button>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--error)',
                color: 'var(--error)',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {authModalTab === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>
                  Họ và tên
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: 34, height: 40, width: '100%', fontSize: 13 }}
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  className="input"
                  style={{ paddingLeft: 34, height: 40, width: '100%', fontSize: 13 }}
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: authModalTab === 'register' ? 14 : 20 }}>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  className="input"
                  style={{ paddingLeft: 34, height: 40, width: '100%', fontSize: 13 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {authModalTab === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>
                  Nhập lại mật khẩu
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    required
                    className="input"
                    style={{ paddingLeft: 34, height: 40, width: '100%', fontSize: 13 }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>{authModalTab === 'login' ? t('auth.loginTab') : t('auth.registerTab')}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            <span className="text-xs text-muted">{t('common.or') || 'OR'}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          </div>

          {/* Google Sign-In Container */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {googleClientId ? (
              <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
            ) : (
              <button
                type="button"
                onClick={handleGoogleFallbackClick}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--bg-surface-2)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{t('auth.googleSignIn')}</span>
              </button>
            )}
          </div>

          {/* Footer note */}
          <div className="text-muted text-xs" style={{ textAlign: 'center', marginTop: 20 }}>
            {authModalTab === 'login' ? (
              <span>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {t('auth.clickToRegister')}
                </button>
              </span>
            ) : (
              <span>
                {t('auth.hasAccount')}{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {t('auth.clickToLogin')}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
