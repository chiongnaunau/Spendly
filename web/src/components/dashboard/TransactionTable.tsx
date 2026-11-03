'use client';
import { useState } from 'react';
import type { Transaction } from '@/lib/types';
import { money, formatDate } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Trash2 } from 'lucide-react';

interface TransactionTableProps {
  data: Transaction[];
  isLoading?: boolean;
  emptyMsg?: string;
  onDelete?: (id: number) => Promise<void>;
}

export function TransactionTable({ data, isLoading, emptyMsg, onDelete }: TransactionTableProps) {
  const { t, getCategoryLabel } = useTranslation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fallbackEmpty = emptyMsg ?? t('dashboard.noTx');

  async function handleDelete(id: number) {
    if (!onDelete) return;
    if (!window.confirm(t('quickAdd.deleteConfirm'))) return;
    try {
      setDeletingId(id);
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('dashboard.colItem')}</th>
              <th>{t('dashboard.colStore')}</th>
              <th>{t('dashboard.colCategory')}</th>
              <th>{t('dashboard.colDate')}</th>
              <th style={{ textAlign: 'right' }}>{t('dashboard.colAmount')}</th>
              {onDelete && <th style={{ width: 44 }}></th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: onDelete ? 6 : 5 }).map((_, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: 16, width: j === 4 ? 80 : '70%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
        <div>{fallbackEmpty}</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('dashboard.colItem')}</th>
            <th>{t('dashboard.colStore')}</th>
            <th>{t('dashboard.colCategory')}</th>
            <th>{t('dashboard.colDate')}</th>
            <th style={{ textAlign: 'right' }}>{t('dashboard.colAmount')}</th>
            {onDelete && <th style={{ width: 44 }}></th>}
          </tr>
        </thead>
        <tbody>
          {data.map(tx => (
            <tr key={tx.id}>
              <td style={{ fontWeight: 600, maxWidth: 200 }} className="truncate">
                {tx.item_name}
              </td>
              <td className="td-muted truncate" style={{ maxWidth: 160 }}>
                {tx.store_name ?? '—'}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="category-tag" style={{
                    background: tx.type === 'INCOME' ? 'rgba(34,197,94,0.12)' : 'var(--accent-muted)',
                    color: tx.type === 'INCOME' ? 'var(--success)' : 'var(--accent)',
                  }}>
                    {getCategoryLabel(tx.category)}
                  </span>
                </div>
              </td>
              <td className="td-muted">{formatDate(tx.transaction_date)}</td>
              <td className="td-amount" style={{
                textAlign: 'right',
                color: tx.type === 'INCOME' ? 'var(--success)' : 'inherit',
                fontWeight: 700
              }}>
                {tx.type === 'INCOME' ? '+' : ''}{money(tx.total_price)}
              </td>
              {onDelete && (
                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    title={t('quickAdd.actionDelete')}
                    style={{ padding: 6, color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} color={deletingId === tx.id ? 'var(--text-muted)' : 'var(--error)'} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
