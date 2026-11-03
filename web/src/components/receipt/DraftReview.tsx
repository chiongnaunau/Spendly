'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ReceiptDraft } from '@/lib/types';
import { confirmReceipt } from '@/lib/api';
import { money } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { CheckCircle, AlertCircle, Store, Calendar, ReceiptText, Check, ArrowRight, Loader2 } from 'lucide-react';

interface DraftReviewProps {
  draft: ReceiptDraft;
  onReset: () => void;
}

export function DraftReview({ draft, onReset }: DraftReviewProps) {
  const { t, getCategoryLabel, lang } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [saveError, setSaveError] = useState('');

  const isError = draft.status === 'error';
  const confidencePct = draft.ocr_confidence ? Math.round(draft.ocr_confidence * 100) : null;

  async function handleConfirm() {
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await confirmReceipt({
        store_name: draft.store_name,
        transaction_date: draft.transaction_date,
        items: draft.items,
        grand_total: draft.grand_total,
        ocr_confidence: draft.ocr_confidence,
      });
      setSavedCount(res.saved_count);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : (lang === 'vi' ? 'Lỗi khi lưu giao dịch vào cơ sở dữ liệu' : 'Failed to save transactions'));
    } finally {
      setIsSaving(false);
    }
  }

  if (saveSuccess) {
    return (
      <div className="card animate-in" style={{ borderColor: 'var(--success)', borderLeftWidth: 4, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <CheckCircle size={28} color="var(--success)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t('receipt.saveSuccessTitle')}</div>
            <div className="text-muted text-sm">
              {t('receipt.saveSuccessDesc', { count: savedCount })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link href="/" className="btn btn-primary" style={{ gap: 8 }}>
            <span>{t('receipt.viewDashboard')}</span>
            <ArrowRight size={16} />
          </Link>
          <button className="btn btn-secondary" onClick={onReset}>
            {t('receipt.uploadAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="card mb-4" style={{ borderColor: isError ? 'var(--error)' : 'var(--accent)', borderLeftWidth: 4 }}>
        <div className="flex items-center gap-3 mb-4">
          {isError ? (
            <AlertCircle size={22} color="var(--error)" />
          ) : (
            <CheckCircle size={22} color="var(--accent)" />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {isError ? t('receipt.extractFailed') : t('receipt.resultTitle')}
            </div>
            <div className="text-muted text-sm">
              {isError ? draft.error : t('receipt.checkBeforeSave')}
            </div>
          </div>
          {confidencePct && !isError && (
            <span className={'badge ml-auto ' + (confidencePct >= 80 ? 'badge-success' : 'badge-warning')}>
              {confidencePct}% {t('receipt.aiConfidenceTag')}
            </span>
          )}
        </div>

        {!isError && (
          <div className="grid-3 gap-3 mt-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <Store size={16} color="var(--accent)" />
              <div>
                <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{t('receipt.store')}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{draft.store_name ?? '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <Calendar size={16} color="var(--accent)" />
              <div>
                <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{t('receipt.date')}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{draft.transaction_date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <ReceiptText size={16} color="var(--accent)" />
              <div>
                <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{t('receipt.total')}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>{money(draft.grand_total)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items table */}
      {draft.items.length > 0 && (
        <div className="card mb-4">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>{t('receipt.itemsDetail')} ({draft.items.length})</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('dashboard.colItem')}</th>
                  <th>{t('dashboard.colCategory')}</th>
                  <th>{lang === 'vi' ? 'SL' : 'Qty'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Đơn giá' : 'Unit Price'}</th>
                  <th style={{ textAlign: 'right' }}>{t('dashboard.colAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td>
                      <span className="category-tag">{getCategoryLabel(item.category)}</span>
                    </td>
                    <td className="td-muted">{item.quantity ?? '—'}</td>
                    <td className="td-amount" style={{ textAlign: 'right' }}>
                      {item.unit_price ? money(item.unit_price) : '—'}
                    </td>
                    <td className="td-amount" style={{ textAlign: 'right' }}>
                      {money(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {saveError && (
        <div className="card mb-4" style={{ borderColor: 'var(--error)', borderLeftWidth: 4, color: 'var(--error)', fontSize: 14 }}>
          {saveError}
        </div>
      )}

      {/* Notice + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {!isError && (
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isSaving || draft.items.length === 0}
            style={{ gap: 8 }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="spinner" />
                <span>{t('receipt.saving')}</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{t('receipt.saveToLedger')}</span>
              </>
            )}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onReset} disabled={isSaving}>
          {isError ? (lang === 'vi' ? 'Thử lại' : 'Retry') : (lang === 'vi' ? 'Hủy & Quét lại' : 'Cancel & Re-scan')}
        </button>
      </div>
    </div>
  );
}
