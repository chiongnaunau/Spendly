'use client';
import { useState } from 'react';
import type { Wallet, WalletsSummary } from '@/lib/types';
import { money } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { createWallet, deleteWallet, transferWallet } from '@/lib/api';
import {
  Wallet as WalletIcon,
  CreditCard,
  Building2,
  Smartphone,
  Plus,
  ArrowRightLeft,
  X,
  AlertCircle,
  Trash2,
  Star,
  Banknote
} from 'lucide-react';

interface WalletManagerProps {
  summary: WalletsSummary | null;
  isLoading?: boolean;
  onRefresh: () => void;
}

const COLOR_PRESETS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
];

export function WalletManager({ summary, isLoading, onRefresh }: WalletManagerProps) {
  const { t } = useTranslation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Add form state
  const [name, setName] = useState('');
  const [type, setType] = useState('CASH');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#10b981');
  const [isDefault, setIsDefault] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState('');

  // Transfer form state
  const [fromWalletId, setFromWalletId] = useState<number | ''>('');
  const [toWalletId, setToWalletId] = useState<number | ''>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferError, setTransferError] = useState('');

  const wallets = summary?.wallets ?? [];

  function openTransferModal() {
    if (wallets.length >= 2) {
      setFromWalletId(wallets[0].id);
      setToWalletId(wallets[1].id);
    } else if (wallets.length === 1) {
      setFromWalletId(wallets[0].id);
      setToWalletId('');
    }
    setTransferAmount('');
    setTransferNote('');
    setTransferError('');
    setIsTransferOpen(true);
  }

  async function handleCreateWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setAddError(t('wallets.walletName') + ' không được để trống.');
      return;
    }
    const cleanBal = Number(initialBalance.replace(/[^0-9]/g, '')) || 0;

    setSavingAdd(true);
    setAddError('');
    try {
      await createWallet({
        name: name.trim(),
        type,
        initial_balance: cleanBal,
        color,
        is_default: isDefault,
      });
      setIsAddOpen(false);
      setName('');
      setInitialBalance('');
      onRefresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Lỗi khi tạo ví');
    } finally {
      setSavingAdd(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!fromWalletId || !toWalletId) {
      setTransferError('Vui lòng chọn ví nguồn và ví đích');
      return;
    }
    if (fromWalletId === toWalletId) {
      setTransferError('Ví nguồn và ví đích phải khác nhau');
      return;
    }
    const cleanAmount = Number(transferAmount.replace(/[^0-9]/g, ''));
    if (!cleanAmount || cleanAmount <= 0) {
      setTransferError('Số tiền chuyển phải lớn hơn 0');
      return;
    }

    setSavingTransfer(true);
    setTransferError('');
    try {
      await transferWallet({
        from_wallet_id: Number(fromWalletId),
        to_wallet_id: Number(toWalletId),
        amount: cleanAmount,
        note: transferNote.trim() || undefined,
      });
      setIsTransferOpen(false);
      onRefresh();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Lỗi khi chuyển tiền');
    } finally {
      setSavingTransfer(false);
    }
  }

  async function handleDelete(w: Wallet) {
    if (!confirm(`${t('wallets.deleteConfirm')} (${w.name})`)) return;
    try {
      await deleteWallet(w.id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa ví');
    }
  }

  function renderWalletIcon(wType: string, wColor: string) {
    switch (wType) {
      case 'BANK':
        return <Building2 size={18} color={wColor} />;
      case 'CREDIT_CARD':
        return <CreditCard size={18} color={wColor} />;
      case 'E_WALLET':
        return <Smartphone size={18} color={wColor} />;
      default:
        return <Banknote size={18} color={wColor} />;
    }
  }

  if (isLoading) {
    return (
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="skeleton" style={{ height: 22, width: 160 }} />
          <div className="skeleton" style={{ height: 32, width: 100 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="skeleton" style={{ height: 90, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 90, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  const numericBalPreview = Number(initialBalance.replace(/[^0-9]/g, '')) || 0;
  const numericTransferPreview = Number(transferAmount.replace(/[^0-9]/g, '')) || 0;

  return (
    <>
      <div
        className="card mb-6"
        style={{
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)',
          border: '1px solid var(--border-strong, var(--border))',
          position: 'relative',
        }}
      >
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
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WalletIcon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {t('wallets.title')}
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {wallets.length} {t('wallets.walletsCount')}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {t('wallets.totalNetWorth')}:{' '}
                <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {money(summary?.total_balance ?? 0)}
                </strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={openTransferModal}
              disabled={wallets.length < 2}
              title={wallets.length < 2 ? t('wallets.needTwoWallets') : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowRightLeft size={14} />
              <span>{t('wallets.transfer')}</span>
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setAddError('');
                setIsAddOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} />
              <span>{t('wallets.addWallet')}</span>
            </button>
          </div>
        </div>

        {/* Wallets Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {wallets.map((w) => (
            <div
              key={w.id}
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid var(--border)`,
                borderLeft: `4px solid ${w.color}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${w.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderWalletIcon(w.type, w.color)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {w.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {w.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {w.is_default && (
                    <span title={t('wallets.defaultWallet')} style={{ color: '#f59e0b', display: 'flex' }}>
                      <Star size={13} fill="#f59e0b" />
                    </span>
                  )}
                  {wallets.length > 1 && (
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => void handleDelete(w)}
                      title={t('wallets.deleteWallet')}
                      style={{ padding: 4, width: 22, height: 22, color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('wallets.currentBalance')}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    marginTop: 2,
                    color: Number(w.current_balance) < 0 ? 'var(--error)' : 'var(--text-primary)',
                  }}
                >
                  {money(w.current_balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Thêm ví mới */}
      {isAddOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingAdd) setIsAddOpen(false);
          }}
        >
          <div className="modal-content animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WalletIcon size={20} color="var(--accent)" />
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('wallets.modalAddTitle')}</h2>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setIsAddOpen(false)}
                disabled={savingAdd}
                style={{ padding: 6, margin: '-6px -6px 0 0' }}
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'var(--error-bg)',
                  color: 'var(--error)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWallet}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('wallets.walletName')} *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder={t('wallets.walletNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('wallets.walletType')}
                </label>
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="CASH">{t('wallets.typeCash')}</option>
                  <option value="BANK">{t('wallets.typeBank')}</option>
                  <option value="CREDIT_CARD">{t('wallets.typeCreditCard')}</option>
                  <option value="E_WALLET">{t('wallets.typeEWallet')}</option>
                  <option value="OTHER">{t('wallets.typeOther')}</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t('wallets.initialBalance')}</label>
                  {numericBalPreview > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                      {money(numericBalPreview)}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                />
              </div>

              {/* Color selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  {t('wallets.color')}
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: c,
                        border: color === c ? '3px solid #fff' : '2px solid transparent',
                        boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                  <span>{t('wallets.isDefault')}</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddOpen(false)}
                  disabled={savingAdd}
                >
                  {t('wallets.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingAdd} style={{ minWidth: 100 }}>
                  {savingAdd ? t('wallets.saving') : t('wallets.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chuyển tiền giữa các ví */}
      {isTransferOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingTransfer) setIsTransferOpen(false);
          }}
        >
          <div className="modal-content animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowRightLeft size={20} color="var(--accent)" />
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('wallets.modalTransferTitle')}</h2>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setIsTransferOpen(false)}
                disabled={savingTransfer}
                style={{ padding: 6, margin: '-6px -6px 0 0' }}
              >
                <X size={18} />
              </button>
            </div>

            {transferError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'var(--error-bg)',
                  color: 'var(--error)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransfer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    {t('wallets.fromWallet')} *
                  </label>
                  <select
                    className="input"
                    value={fromWalletId}
                    onChange={(e) => setFromWalletId(Number(e.target.value))}
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({money(w.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    {t('wallets.toWallet')} *
                  </label>
                  <select
                    className="input"
                    value={toWalletId}
                    onChange={(e) => setToWalletId(Number(e.target.value))}
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({money(w.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t('wallets.transferAmount')} *</label>
                  {numericTransferPreview > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                      {money(numericTransferPreview)}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  required
                  placeholder="VD: 500000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('wallets.note')}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('wallets.notePlaceholder')}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsTransferOpen(false)}
                  disabled={savingTransfer}
                >
                  {t('wallets.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingTransfer}
                  style={{ minWidth: 120 }}
                >
                  {savingTransfer ? t('wallets.saving') : t('wallets.submitTransfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
