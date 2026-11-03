'use client';
import { useState } from 'react';
import { uploadReceipt } from '@/lib/api';
import type { ReceiptDraft } from '@/lib/types';
import { DropZone } from '@/components/receipt/DropZone';
import { DraftReview } from '@/components/receipt/DraftReview';
import { useTranslation } from '@/hooks/useTranslation';
import { Sparkles } from 'lucide-react';

export default function ReceiptPage() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setError(''); setDraft(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const result = await uploadReceipt(file);
      setDraft(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('receipt.errorTitle'));
    } finally { setLoading(false); }
  }

  function reset() {
    setDraft(null); setPreview(null); setError('');
    if (preview) URL.revokeObjectURL(preview);
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h1 className="page-title">{t('receipt.title')}</h1>
          <span className="badge badge-success" style={{ marginTop:2 }}>
            <Sparkles size={10} /> Gemini Vision
          </span>
        </div>
        <p className="page-subtitle">{t('receipt.subtitle')}</p>
      </div>

      {/* AI badge */}
      <div className="card mb-6" style={{ background:'var(--accent-muted)', border:'1px solid var(--accent-light)', padding:'14px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'var(--accent)', fontWeight:600 }}>
          <Sparkles size={16} />
          {t('receipt.aiBadge')}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap:24 }}>
        <div>
          {!draft && (
            <div className="card">
              <DropZone
                onFile={handleFile}
                isLoading={loading}
                label={t('receipt.chooseFile')}
                sublabel={t('receipt.dragDrop')}
                formats={t('receipt.formats')}
              />
              {error && (
                <div style={{ marginTop:16, padding:'12px 16px', background:'var(--error-bg)', borderRadius:'var(--radius-sm)', color:'var(--error)', fontSize:14 }}>
                  {error}
                </div>
              )}
            </div>
          )}
          {draft && <DraftReview draft={draft} onReset={reset} />}
        </div>

        {preview && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Receipt preview"
              style={{ width:'100%', height:'100%', objectFit:'contain', maxHeight:600, background:'var(--bg-surface-2)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
