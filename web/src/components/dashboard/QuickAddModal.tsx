'use client';
import { useState } from 'react';
import { createTransaction } from '@/lib/api';
import { getExpenseCategoryOptions, getIncomeCategoryOptions } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { X, PlusCircle, CheckCircle2, AlertCircle, Sparkles, ArrowDownRight, ArrowUpRight } from 'lucide-react';

import type { Wallet } from '@/lib/types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets?: Wallet[];
}

const EXPENSE_PRESETS = [
  { label: 'Cà phê', category: 'FOOD', icon: '☕' },
  { label: 'Ăn trưa', category: 'FOOD', icon: '🍜' },
  { label: 'Gửi xe', category: 'TRANSPORT', icon: '🅿️' },
  { label: 'Xăng xe', category: 'TRANSPORT', icon: '⛽' },
  { label: 'Đi chợ', category: 'SHOPPING', icon: '🛒' },
  { label: 'Trà sữa', category: 'FOOD', icon: '🧋' },
];

const INCOME_PRESETS = [
  { label: 'Tiền lương', category: 'luong', icon: '💼' },
  { label: 'Tiền thưởng', category: 'thuong', icon: '🎁' },
  { label: 'Bán hàng', category: 'kinh_doanh', icon: '🏪' },
  { label: 'Lãi đầu tư', category: 'dau_tu', icon: '📈' },
  { label: 'Phụ cấp', category: 'phu_cap', icon: '🧧' },
];

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

export function QuickAddModal({ isOpen, onClose, onSuccess, wallets = [] }: QuickAddModalProps) {
  const { t } = useTranslation();
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [walletId, setWalletId] = useState<number | ''>('');
  const [storeName, setStoreName] = useState('');
  const [txDate, setTxDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTxType('EXPENSE');
      setTxDate(getTodayISO());
      setItemName('');
      setAmount('');
      setCategory('FOOD');
      const def = wallets.find(w => w.is_default) || wallets[0];
      setWalletId(def ? def.id : '');
      setStoreName('');
      setError('');
      setSuccess(false);
    }
  }


  if (!isOpen) return null;

  function handleTypeChange(newType: 'EXPENSE' | 'INCOME') {
    setTxType(newType);
    setItemName('');
    setCategory(newType === 'EXPENSE' ? 'FOOD' : 'luong');
    setError('');
  }

  function handleSelectPreset(label: string, cat: string) {
    setItemName(label);
    setCategory(cat);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = itemName.trim();
    const numAmount = Number(amount.replace(/[^0-9]/g, ''));

    if (!cleanName) {
      setError(t('quickAdd.itemName') + ' không được để trống.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError(t('quickAdd.amount') + ' phải lớn hơn 0.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createTransaction({
        item_name: cleanName,
        total_price: numAmount,
        category: category,
        type: txType,
        wallet_id: walletId ? Number(walletId) : undefined,
        store_name: storeName.trim() || null,
        transaction_date: txDate || getTodayISO(),
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu giao dịch.');
      setLoading(false);
    }
  }


  const numericVal = Number(amount.replace(/[^0-9]/g, '')) || 0;
  const formattedPreview = numericVal > 0 ? numericVal.toLocaleString('vi-VN') + ' ₫' : '';
  const isIncome = txType === 'INCOME';
  const categoryList = isIncome ? getIncomeCategoryOptions(t) : getExpenseCategoryOptions(t);
  const currentPresets = isIncome ? INCOME_PRESETS : EXPENSE_PRESETS;

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="modal-content animate-in">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={20} color={isIncome ? 'var(--success)' : 'var(--accent)'} />
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {isIncome ? t('quickAdd.incomeTitle') : t('quickAdd.modalTitle')}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {isIncome ? t('quickAdd.incomeSubtitle') : t('quickAdd.modalSubtitle')}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={loading}
            style={{ padding: 6, margin: '-6px -6px 0 0' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Type Switcher Tabs (Chi tiêu vs Thu nhập) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4,
          background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', marginBottom: 16
        }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: !isIncome ? 'var(--bg-surface)' : 'transparent',
              color: !isIncome ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: !isIncome ? 700 : 500,
              boxShadow: !isIncome ? 'var(--shadow-sm)' : 'none',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
            onClick={() => handleTypeChange('EXPENSE')}
          >
            <ArrowDownRight size={14} color="var(--error)" />
            <span>{t('quickAdd.tabExpense')}</span>
          </button>

          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: isIncome ? 'var(--bg-surface)' : 'transparent',
              color: isIncome ? 'var(--success)' : 'var(--text-muted)',
              fontWeight: isIncome ? 700 : 500,
              boxShadow: isIncome ? 'var(--shadow-sm)' : 'none',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
            onClick={() => handleTypeChange('INCOME')}
          >
            <ArrowUpRight size={14} color="var(--success)" />
            <span>{t('quickAdd.tabIncome')}</span>
          </button>
        </div>

        {/* Quick Picks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} color={isIncome ? 'var(--success)' : 'var(--accent)'} />
            <span>{t('quickAdd.quickPicks')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {currentPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-sm btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 16,
                  borderColor: itemName === p.label ? (isIncome ? 'var(--success)' : 'var(--accent)') : 'var(--border)',
                  background: itemName === p.label ? (isIncome ? 'rgba(34,197,94,0.1)' : 'var(--accent-muted)') : 'var(--bg-surface-2)',
                  color: itemName === p.label ? (isIncome ? 'var(--success)' : 'var(--accent)') : 'var(--text-primary)',
                }}
                onClick={() => handleSelectPreset(p.label, p.category)}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
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

        <form onSubmit={handleSubmit}>
          {/* Item Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {isIncome ? t('quickAdd.sourceName') : t('quickAdd.itemName')} *
            </label>
            <input
              type="text"
              className="input"
              required
              placeholder={isIncome ? t('quickAdd.sourcePlaceholder') : t('quickAdd.itemNamePlaceholder')}
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>{t('quickAdd.amount')} *</label>
              {formattedPreview && (
                <span style={{ fontSize: 13, fontWeight: 700, color: isIncome ? 'var(--success)' : 'var(--accent)' }}>
                  {isIncome ? '+' : ''}{formattedPreview}
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              required
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Category & Date in 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                {t('quickAdd.category')}
              </label>
              <select
                className="input"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categoryList.map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                {t('quickAdd.date')}
              </label>
              <input
                type="date"
                className="input"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
              />
            </div>
          </div>

          {/* Wallet selector (Optional) */}
          {wallets.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                {t('quickAdd.wallet')}
              </label>
              <select
                className="input"
                value={walletId}
                onChange={e => setWalletId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">{t('quickAdd.noWallet')}</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Store / Source (Optional) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {isIncome ? t('quickAdd.partner') : t('quickAdd.store')}
            </label>
            <input
              type="text"
              className="input"
              placeholder={isIncome ? t('quickAdd.partnerPlaceholder') : t('quickAdd.storePlaceholder')}
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
            />
          </div>


          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t('quickAdd.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
              style={{
                minWidth: 120,
                background: isIncome ? 'var(--success)' : 'var(--accent)',
              }}
            >
              {success ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t('quickAdd.saved')}</span>
                </>
              ) : loading ? (
                <span>{t('quickAdd.saving')}</span>
              ) : (
                <span>{t('quickAdd.submit')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
