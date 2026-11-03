'use client';
import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';

export function AuthLandingView() {
  const { login, register, loginWithGoogle } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Initialize Google Identity Services
  useEffect(() => {
    if (!googleScriptLoaded || !googleBtnRef.current || !googleClientId) return;

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
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: tab === 'login' ? 'signin_with' : 'signup_with',
          shape: 'pill',
        });
      }
    } catch (e) {
      console.warn('Google Identity initialization notice:', e);
    }
  }, [googleScriptLoaded, googleClientId, tab, loginWithGoogle]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('auth.validationFillBoth'));
      return;
    }

    if (tab === 'register') {
      if (password.length < 6) {
        setError(t('auth.validationPasswordLength'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.validationPasswordMatch'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.processing'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Quick 1-click test login helper
  async function handleQuickLogin(testEmail: string, testPass: string) {
    setEmail(testEmail);
    setPassword(testPass);
    setError('');
    setIsSubmitting(true);
    try {
      await login(testEmail, testPass);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="avenue-auth-container">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptLoaded(true)}
      />

      {/* Ambient Lighting & Grid (Avenue Z subtle depth) */}
      <div className="spotlight-top" />
      <div className="ambient-blue-glow" />
      <div className="grid-subtle-overlay" />

      {/* Header with Brand Logo & Title & Language Toggle */}
      <header className="avenue-header">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%', maxWidth: 860, margin: '0 auto 12px' }}>
          <div className="brand-logo-row">
            <div className="logo-icon-box">💸</div>
            <span className="logo-text">Spendly</span>
          </div>

          {/* Language switcher */}
          <div style={{ position: 'absolute', right: 0, display: 'flex', gap: 6, background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: 20, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {(['en', 'vi'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? '#4271d5' : 'transparent',
                  color: lang === l ? '#ffffff' : '#8a8a87',
                  border: 'none',
                  borderRadius: 14,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <h1 className="header-title">{t('auth.title')}</h1>
        <p className="header-subtitle">{t('auth.subtitle')}</p>
      </header>

      {/* Centered Main Floating Card — Avenue Z Dark Palette */}
      <div className="avenue-main-card">
        {/* Left Side: Isometric Graphic with Avenue Z Cobalt & Dark Glass Palette */}
        <div className="card-left-visual">
          <svg viewBox="0 0 400 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="iso-svg">
            <defs>
              <linearGradient id="phoneDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e2433" />
                <stop offset="100%" stopColor="#0f131a" />
              </linearGradient>
              <linearGradient id="phoneAvenueBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4271d5" />
                <stop offset="100%" stopColor="#254ea8" />
              </linearGradient>
              <linearGradient id="buildingAvenueMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5587f0" />
                <stop offset="100%" stopColor="#4271d5" />
              </linearGradient>
              <linearGradient id="buildingCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="buildingEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="roadDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e283d" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
              <filter id="shadowAvenue" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#4271d5" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Isometric Base Plate / Phone */}
            <g filter="url(#shadowAvenue)">
              {/* Phone 3D Thickness */}
              <path d="M 60 210 L 200 280 L 340 210 L 340 224 L 200 294 L 60 224 Z" fill="#090d14" />
              <path d="M 200 280 L 340 210 L 340 224 L 200 294 Z" fill="#141c2c" />
              {/* Phone Top Face */}
              <path d="M 200 130 L 340 200 L 200 270 L 60 200 Z" fill="url(#phoneDarkGrad)" stroke="url(#phoneAvenueBorder)" strokeWidth="2.5" />
              {/* Screen Inner Track / Road */}
              <path d="M 200 160 L 305 212 L 200 262 L 95 212 Z" fill="#0d111a" stroke="rgba(66, 113, 213, 0.4)" strokeWidth="1.5" />
              <path d="M 200 178 L 275 215 L 200 250 L 125 215 Z" fill="url(#roadDarkGrad)" />
            </g>

            {/* Isometric Buildings on Top */}
            {/* Building 1 (Center Tall Avenue Z Cobalt) */}
            <g transform="translate(160, 80)">
              {/* Left Face */}
              <path d="M 40 70 L 40 135 L 75 152 L 75 87 Z" fill="url(#buildingAvenueMain)" />
              {/* Right Face */}
              <path d="M 75 87 L 75 152 L 110 135 L 110 70 Z" fill="#1e3a8a" />
              {/* Top Face */}
              <path d="M 75 52 L 110 70 L 75 87 L 40 70 Z" fill="#6ba0ff" />
              {/* Illuminated Windows */}
              <path d="M 46 80 L 46 88 L 54 92 L 54 84 Z" fill="#e0f2fe" opacity="0.9" />
              <path d="M 58 86 L 58 94 L 66 98 L 66 90 Z" fill="#e0f2fe" opacity="0.9" />
              <path d="M 46 96 L 46 104 L 54 108 L 54 100 Z" fill="#e0f2fe" opacity="0.9" />
              <path d="M 58 102 L 58 110 L 66 114 L 66 106 Z" fill="#e0f2fe" opacity="0.9" />
              <path d="M 46 112 L 46 120 L 54 124 L 54 116 Z" fill="#e0f2fe" opacity="0.9" />
              <path d="M 58 118 L 58 126 L 66 130 L 66 122 Z" fill="#e0f2fe" opacity="0.9" />
            </g>

            {/* Building 2 (Left Cyan Accent) */}
            <g transform="translate(95, 115)">
              <path d="M 25 50 L 25 95 L 50 107 L 50 62 Z" fill="url(#buildingCyan)" />
              <path d="M 50 62 L 50 107 L 75 95 L 75 50 Z" fill="#0369a1" />
              <path d="M 50 38 L 75 50 L 50 62 L 25 50 Z" fill="#7dd3fc" />
              <path d="M 30 58 L 30 65 L 36 68 L 36 61 Z" fill="#ffffff" opacity="0.85" />
              <path d="M 40 63 L 40 70 L 46 73 L 46 66 Z" fill="#ffffff" opacity="0.85" />
              <path d="M 30 72 L 30 79 L 36 82 L 36 75 Z" fill="#ffffff" opacity="0.85" />
              <path d="M 40 77 L 40 84 L 46 87 L 46 80 Z" fill="#ffffff" opacity="0.85" />
            </g>

            {/* Building 3 (Right Emerald / Finance block) */}
            <g transform="translate(210, 130)">
              <path d="M 20 40 L 20 75 L 45 87 L 45 52 Z" fill="url(#buildingEmerald)" />
              <path d="M 45 52 L 45 87 L 70 75 L 70 40 Z" fill="#047857" />
              <path d="M 45 28 L 70 40 L 45 52 L 20 40 Z" fill="#6ee7b7" />
            </g>

            {/* Floating Network Nodes */}
            <g className="floating-nodes">
              <circle cx="90" cy="110" r="14" fill="#131926" stroke="#4271d5" strokeWidth="2" />
              <text x="90" y="114" textAnchor="middle" fontSize="11" fill="#6ba0ff">📊</text>

              <circle cx="200" cy="55" r="16" fill="#131926" stroke="#4271d5" strokeWidth="2.5" />
              <text x="200" y="60" textAnchor="middle" fontSize="13" fill="#6ba0ff">🤖</text>

              <circle cx="310" cy="115" r="14" fill="#131926" stroke="#34d399" strokeWidth="2" />
              <text x="310" y="119" textAnchor="middle" fontSize="11" fill="#34d399">💳</text>

              <circle cx="65" cy="180" r="12" fill="#131926" stroke="#fbbf24" strokeWidth="2" />
              <text x="65" y="184" textAnchor="middle" fontSize="10" fill="#fbbf24">🧾</text>

              {/* Connecting Data Lines */}
              <path d="M 90 110 Q 140 75 200 55" stroke="#4271d5" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
              <path d="M 200 55 Q 260 80 310 115" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
              <path d="M 90 110 Q 75 145 65 180" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
            </g>
          </svg>

          <div className="left-tagline">
            <div className="tagline-badge">{t('auth.tagline')}</div>
            <p className="tagline-text">{t('auth.desc')}</p>
          </div>
        </div>

        {/* Right Side: Clean Form with Avenue Z Colors */}
        <div className="card-right-form">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`tab-item ${tab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setTab('login');
                setError('');
              }}
            >
              {t('auth.loginTab')}
              {tab === 'login' && <span className="tab-indicator" />}
            </button>
            <button
              type="button"
              className={`tab-item ${tab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setTab('register');
                setError('');
              }}
            >
              {t('auth.registerTab')}
              {tab === 'register' && <span className="tab-indicator" />}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="form-error-alert">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Clean Form */}
          <form onSubmit={handleSubmit} className="clean-form">
            {tab === 'register' && (
              <div className="input-group">
                <UserIcon size={18} className="field-icon" />
                <input
                  type="text"
                  className="clean-input"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="input-group">
              <Mail size={18} className="field-icon" />
              <input
                type="email"
                required
                className="clean-input"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <Lock size={18} className="field-icon" />
              <input
                type="password"
                required
                className="clean-input"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {tab === 'register' && (
              <div className="input-group">
                <Lock size={18} className="field-icon" />
                <input
                  type="password"
                  required
                  className="clean-input"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {/* Quick 1-click test pills */}
            <div className="quick-test-box">
              <div className="quick-test-header">
                <Zap size={12} color="#4271d5" />
                <span>{t('auth.quickTestHeader')}</span>
              </div>
              <div className="quick-pills-row">
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickLogin('demo@spendly.vn', 'password123')}
                  title={t('auth.demoTooltip')}
                >
                  <span className="dot dot-blue" />
                  <strong>demo@spendly.vn</strong> ({t('auth.demoPillLabel')})
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickLogin('bob@example.com', 'password456')}
                  title={t('auth.bobTooltip')}
                >
                  <span className="dot dot-cyan" />
                  <strong>bob@example.com</strong> ({t('auth.bobPillLabel')})
                </button>
              </div>
            </div>

            {/* Primary Action Button — Avenue Z Cobalt Blue */}
            <button type="submit" disabled={isSubmitting} className="avenue-submit-btn">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>{t('auth.processing')}</span>
                </>
              ) : (
                <span>{tab === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}</span>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          <div className="google-section">
            {googleClientId ? (
              <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
            ) : (
              <button
                type="button"
                className="google-avenue-btn"
                onClick={() => setError(t('auth.googleErrorConfig'))}
              >
                <svg width="17" height="17" viewBox="0 0 24 24">
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

          {/* Footer toggle link */}
          <div className="card-footer-link">
            <span>
              {tab === 'login' ? t('auth.noAccount') + ' ' : t('auth.hasAccount') + ' '}
              <button
                type="button"
                className="toggle-text-btn"
                onClick={() => {
                  setTab(tab === 'login' ? 'register' : 'login');
                  setError('');
                }}
              >
                {tab === 'login' ? t('auth.clickToRegister') : t('auth.clickToLogin')}
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Styled JSX using Avenue Z color palette (#000000, #4271d5, #ffffff, #676767, #F2F5F7) */}
      <style jsx>{`
        .avenue-auth-container {
          min-height: 100vh;
          width: 100%;
          background: #08090c;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 28px 16px 40px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .spotlight-top {
          position: absolute;
          top: -140px;
          width: 800px;
          height: 380px;
          background: radial-gradient(ellipse at 50% 0%, rgba(66, 113, 213, 0.3) 0%, rgba(0, 0, 0, 0) 70%);
          filter: blur(50px);
          pointer-events: none;
          z-index: 1;
        }

        .ambient-blue-glow {
          position: absolute;
          bottom: -200px;
          right: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(66, 113, 213, 0.18) 0%, rgba(0, 0, 0, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 1;
        }

        .grid-subtle-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
          z-index: 2;
        }

        .avenue-header {
          position: relative;
          z-index: 10;
          text-align: center;
          margin-bottom: 24px;
        }

        .brand-logo-row {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .logo-icon-box {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #4271d5 0%, #1e3a8a 100%);
          color: #ffffff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          box-shadow: 0 4px 14px rgba(66, 113, 213, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .logo-text {
          font-size: 25px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.6px;
        }

        .header-title {
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.4px;
          margin: 4px 0 2px;
          color: #ffffff;
        }

        .header-subtitle {
          font-size: 11px;
          font-weight: 700;
          color: #8a8a87;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        /* Centered Main Floating Card — Avenue Z Dark Palette */
        .avenue-main-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 860px;
          background: #11141b;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 24px;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.04);
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          overflow: hidden;
          min-height: 480px;
        }

        /* Left Side: Isometric Graphic */
        .card-left-visual {
          background: #0c0f16;
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          position: relative;
        }

        .iso-svg {
          width: 100%;
          max-width: 320px;
          height: auto;
        }

        .left-tagline {
          margin-top: 14px;
          text-align: center;
        }

        .tagline-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #4271d5;
          background: rgba(66, 113, 213, 0.12);
          border: 1px solid rgba(66, 113, 213, 0.3);
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 6px;
        }

        .tagline-text {
          font-size: 12px;
          color: #8a8a87;
          max-width: 260px;
          line-height: 1.5;
        }

        /* Right Side: Clean Form */
        .card-right-form {
          padding: 36px 38px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: #ffffff;
        }

        .auth-tabs {
          display: flex;
          gap: 24px;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 22px;
        }

        .tab-item {
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #676767;
          padding: 0 0 10px 0;
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;
        }

        .tab-item.active {
          color: #ffffff;
          font-weight: 700;
        }

        .tab-indicator {
          position: absolute;
          bottom: -1.5px;
          left: 0;
          right: 0;
          height: 2px;
          background: #4271d5;
          border-radius: 2px;
          box-shadow: 0 0 8px #4271d5;
        }

        .form-error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 14px;
        }

        .clean-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.14);
          padding: 4px 0;
          transition: border-color 0.2s;
        }

        .input-group:focus-within {
          border-color: #4271d5;
        }

        .input-group :global(.field-icon) {
          color: #676767;
          margin-right: 10px;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .input-group:focus-within :global(.field-icon) {
          color: #4271d5;
        }

        .clean-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: #ffffff;
          padding: 6px 0;
          font-family: inherit;
        }

        .clean-input::placeholder {
          color: #676767;
          font-size: 13px;
        }

        .quick-test-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 10px 12px;
          margin-top: 4px;
        }

        .quick-test-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #4271d5;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .quick-pills-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .demo-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11.5px;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .demo-pill:hover {
          background: rgba(66, 113, 213, 0.15);
          border-color: #4271d5;
          color: #ffffff;
          transform: translateY(-1px);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot-blue {
          background: #4271d5;
          box-shadow: 0 0 5px #4271d5;
        }

        .dot-cyan {
          background: #38bdf8;
          box-shadow: 0 0 5px #38bdf8;
        }

        /* Primary Action Button — Avenue Z Signature Cobalt Blue (#4271d5) */
        .avenue-submit-btn {
          margin-top: 8px;
          width: 100%;
          height: 44px;
          border-radius: 22px;
          border: none;
          background: #4271d5;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(66, 113, 213, 0.45);
        }

        .avenue-submit-btn:hover:not(:disabled) {
          background: #3460bf;
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(66, 113, 213, 0.6);
        }

        .avenue-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .google-section {
          margin-top: 14px;
          display: flex;
          justify-content: center;
        }

        .google-avenue-btn {
          width: 100%;
          height: 40px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .google-avenue-btn:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.22);
          color: #ffffff;
        }

        .card-footer-link {
          margin-top: 16px;
          text-align: center;
          font-size: 12px;
          color: #8a8a87;
        }

        .toggle-text-btn {
          background: none;
          border: none;
          color: #4271d5;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
        }

        .toggle-text-btn:hover {
          color: #6ba0ff;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .avenue-main-card {
            grid-template-columns: 1fr;
            max-width: 420px;
          }

          .card-left-visual {
            display: none;
          }

          .card-right-form {
            padding: 28px 24px;
          }

          .header-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
