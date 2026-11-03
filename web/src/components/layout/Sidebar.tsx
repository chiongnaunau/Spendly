'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, MessageSquare, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { UserProfileMenu } from '@/components/auth/UserProfileMenu';

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useTranslation();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/receipt', icon: Receipt, label: t('nav.receipt') },
    { href: '/chat', icon: MessageSquare, label: t('nav.chat') },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">💸</div>
        <span className="logo-name">Spendly</span>
      </div>

      <nav style={{ flex: 1 }}>
        <div className="nav-section-label">{t('nav.menu')}</div>
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={'nav-item ' + (pathname === href ? 'active' : '')}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <UserProfileMenu />

      <div className="sidebar-bottom">
        <button className="nav-item" onClick={toggle} style={{ gap: 10 }}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span style={{ fontSize: 13 }}>
            {theme === 'dark'
              ? (lang === 'vi' ? 'Chế độ sáng' : 'Light mode')
              : (lang === 'vi' ? 'Chế độ tối' : 'Dark mode')}
          </span>
        </button>
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px' }}>
          {(['en', 'vi'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? 'var(--sidebar-active)' : 'transparent',
                color: lang === l ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                border: 'none', borderRadius: 6, padding: '4px 10px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
