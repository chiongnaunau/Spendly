'use client';
import type { InsightsResponse } from '@/lib/types';
import { money } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface AIInsightsCardProps {
  insights: InsightsResponse | null;
  isLoading?: boolean;
}

export function AIInsightsCard({ insights, isLoading }: AIInsightsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="card mb-6" style={{ background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="skeleton" style={{ height: 24, width: 200 }} />
          <div className="skeleton" style={{ height: 28, width: 100, borderRadius: 20 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ height: 70, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 70, borderRadius: 8 }} />
      </div>
    );
  }

  if (!insights) return null;

  const score = insights.health_score;

  // Determine score badge colors
  let scoreColor = 'var(--accent)';
  let scoreBg = 'var(--accent-muted)';
  let statusText = t('insights.statusGood');
  let scoreIcon = <ShieldCheck size={18} />;

  if (score >= 85) {
    scoreColor = 'var(--success, #10b981)';
    scoreBg = 'rgba(16, 185, 129, 0.12)';
    statusText = t('insights.statusExcellent');
    scoreIcon = <ShieldCheck size={18} />;
  } else if (score >= 65) {
    scoreColor = 'var(--accent)';
    scoreBg = 'var(--accent-muted)';
    statusText = t('insights.statusGood');
    scoreIcon = <Sparkles size={18} />;
  } else if (score >= 45) {
    scoreColor = 'var(--warning, #f59e0b)';
    scoreBg = 'rgba(245, 158, 11, 0.12)';
    statusText = t('insights.statusCaution');
    scoreIcon = <AlertTriangle size={18} />;
  } else {
    scoreColor = 'var(--error, #ef4444)';
    scoreBg = 'rgba(239, 68, 68, 0.12)';
    statusText = t('insights.statusWarning');
    scoreIcon = <ShieldAlert size={18} />;
  }

  function renderLevelBadge(level: string) {
    switch (level) {
      case 'SUCCESS':
        return {
          icon: <CheckCircle2 size={18} color="var(--success, #10b981)" />,
          border: '1px solid rgba(16, 185, 129, 0.25)',
          bg: 'rgba(16, 185, 129, 0.05)',
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle size={18} color="var(--warning, #f59e0b)" />,
          border: '1px solid rgba(245, 158, 11, 0.25)',
          bg: 'rgba(245, 158, 11, 0.05)',
        };
      case 'DANGER':
        return {
          icon: <AlertCircle size={18} color="var(--error, #ef4444)" />,
          border: '1px solid rgba(239, 68, 68, 0.25)',
          bg: 'rgba(239, 68, 68, 0.05)',
        };
      default:
        return {
          icon: <Zap size={18} color="var(--accent)" />,
          border: '1px solid var(--border)',
          bg: 'var(--bg-surface-2)',
        };
    }
  }

  return (
    <div
      className="card mb-6"
      style={{
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)',
        border: '1px solid var(--border-strong, var(--border))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'var(--accent)',
          opacity: 0.06,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {t('insights.title')}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  letterSpacing: '0.04em',
                }}
              >
                Gemini AI
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {t('insights.subtitle')}
            </p>
          </div>
        </div>

        {/* Health score badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 24,
            background: scoreBg,
            border: `1px solid ${scoreColor}33`,
          }}
        >
          <div style={{ color: scoreColor, display: 'flex', alignItems: 'center' }}>
            {scoreIcon}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {t('insights.healthScore')}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor }}>
                {score}/100
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor }}>
                • {statusText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Burn Rate & Projection Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Flame size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t('insights.dailyBurnRate')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: 'var(--text-primary)' }}>
              {money(insights.daily_burn_rate)}
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{t('common.perDay')}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t('insights.projectedTotal')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: 'var(--text-primary)' }}>
              {money(insights.projected_total)}
            </div>
          </div>
        </div>
      </div>

      {/* Insights items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.insights.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            {t('insights.noInsights')}
          </div>
        ) : (
          insights.insights.map((item) => {
            const style = renderLevelBadge(item.level);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: style.bg,
                  border: style.border,
                  transition: 'transform 0.2s ease',
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {style.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary, var(--text-muted))', lineHeight: 1.5 }}>
                    {item.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
