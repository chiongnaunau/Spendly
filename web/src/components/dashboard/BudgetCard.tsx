'use client';
import { useState } from 'react';
import type { BudgetStatus } from '@/lib/types';
import { money } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Target, AlertTriangle, AlertCircle, Edit3, Plus, X, Sparkles } from 'lucide-react';

interface BudgetCardProps {
  budget: BudgetStatus | null;
  isLoading?: boolean;
  onUpdate: (amount: number) => Promise<void>;
}

const BUDGET_PRESETS = [5000000, 10000000, 15000000, 20000000, 30000000];

export function BudgetCard({ budget, isLoading, onUpdate }: BudgetCardProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openModal() {
    if (budget?.budget_amount) {
      setAmountInput(String(Number(budget.budget_amount)));
    } else {
      setAmountInput('');
    }
    setError('');
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleanNum = Number(amountInput.replace(/[^0-9]/g, ''));
    if (!cleanNum || cleanNum <= 0) {
      setError(t('budget.amountLabel') + ' phải lớn hơn 0.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onUpdate(cleanNum);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu ngân sách');
    } finally {
      setSaving(false);
    }
  }

  const numericPreview = Number(amountInput.replace(/[^0-9]/g, '')) || 0;
  const formattedPreview = numericPreview > 0 ? numericPreview.toLocaleString('vi-VN') + ' ₫' : '';

  if (isLoading) {
    return (
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="skeleton" style={{ height: 20, width: 140 }} />
          <div className="skeleton" style={{ height: 24, width: 80 }} />
        </div>
        <div className="skeleton" style={{ height: 10, width: '100%', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="skeleton" style={{ height: 48, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 48, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 48, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  const hasBudget = budget?.budget_amount !== null && budget?.budget_amount !== undefined;
  const pct = budget?.pct_used ?? 0;
  const isOver = budget?.is_over_budget ?? false;
  const isWarning = pct >= 80 && !isOver;

  // Determine progress bar color
  const barColor = isOver
    ? 'var(--error)'
    : isWarning
    ? 'var(--warning)'
    : 'var(--accent)';

  return (
    <>
      <div className="card mb-6" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--accent-muted)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Target size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('budget.title')}</div>
              {hasBudget && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {budget?.days_remaining ?? 0} {t('budget.daysLeft')}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasBudget && (
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                {money(budget?.budget_amount ?? 0)}
              </span>
            )}
            <button
              className={hasBudget ? "btn btn-sm btn-secondary" : "btn btn-sm btn-primary"}
              onClick={openModal}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {hasBudget ? (
                <>
                  <Edit3 size={12} />
                  <span>{t('budget.editBudget')}</span>
                </>
              ) : (
                <>
                  <Plus size={12} />
                  <span>{t('budget.setBudget')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {!hasBudget ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center', background: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-strong)'
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {t('budget.noBudget')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              {t('budget.noBudgetPrompt')}
            </p>
            <button className="btn btn-sm btn-primary" onClick={openModal}>
              <Plus size={14} />
              <span>{t('budget.setBudget')}</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Progress bar container */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                <span>{pct}% {t('budget.spent')}</span>
                <span style={{ color: barColor }}>
                  {isOver ? t('budget.overBudget') : isWarning ? t('budget.nearLimit') : t('budget.withinLimit')}
                </span>
              </div>
              <div style={{
                height: 10, background: 'var(--bg-surface-2)', borderRadius: 10,
                overflow: 'hidden', border: '1px solid var(--border)'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: Math.min(100, pct) + '%',
                    background: barColor,
                    borderRadius: 10,
                    transition: 'width 0.4s ease, background-color 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Warning banners if approaching or exceeded */}
            {isOver && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)',
                fontSize: 13, marginBottom: 14, fontWeight: 600
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{t('budget.statusDanger')}</span>
              </div>
            )}
            {isWarning && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: 'var(--radius-sm)',
                fontSize: 13, marginBottom: 14, fontWeight: 600
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{t('budget.statusWarning')}</span>
              </div>
            )}

            {/* 3 Metrics pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{
                background: 'var(--bg-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {t('budget.spent')}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                  {money(budget?.spent_amount ?? 0)}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {isOver ? t('budget.overBudget') : t('budget.remaining')}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 800, marginTop: 4,
                  color: isOver ? 'var(--error)' : 'var(--text-primary)'
                }}>
                  {money(Math.abs(Number(budget?.remaining_amount ?? 0)))}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {t('budget.safePerDay')}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: isOver ? 'var(--error)' : 'var(--accent)' }}>
                  {money(budget?.safe_to_spend_per_day ?? 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Set Budget Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !saving) setIsModalOpen(false); }}>
          <div className="modal-content animate-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={20} color="var(--accent)" />
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('budget.modalTitle')}</h2>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t('budget.modalSubtitle')}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                style={{ padding: 6, margin: '-6px -6px 0 0' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} color="var(--accent)" />
                <span>Gợi ý mức ngân sách:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BUDGET_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      borderRadius: 16,
                      borderColor: numericPreview === val ? 'var(--accent)' : 'var(--border)',
                      background: numericPreview === val ? 'var(--accent-muted)' : 'var(--bg-surface-2)',
                      color: numericPreview === val ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                    onClick={() => setAmountInput(String(val))}
                  >
                    <span>{(val / 1000000).toFixed(0)} triệu ₫</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t('budget.amountLabel')} *</label>
                  {formattedPreview && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                      {formattedPreview}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  required
                  placeholder="VD: 15000000"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  {t('budget.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ minWidth: 120 }}
                >
                  {saving ? t('budget.saving') : t('budget.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
