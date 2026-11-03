'use client';
import { useState, useRef, useEffect } from 'react';
import { parseNaturalInput, createTransaction } from '@/lib/api';
import type { ParsedExpenseResponse } from '@/lib/types';
import { getExpenseCategoryOptions, getIncomeCategoryOptions } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Sparkles,
  Mic,
  MicOff,
  Check,
  X,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';

interface NaturalInputBarProps {
  onSuccess: () => void;
}

const QUICK_EXAMPLES = [
  'Ăn bún bò 50k sáng nay',
  'Đổ xăng xe 80k tại Petrolimex',
  'Mua áo sơ mi 350k Shopee',
  'Nhận thưởng dự án 5 triệu',
];

export function NaturalInputBar({ onSuccess }: NaturalInputBarProps) {
  const { t, lang } = useTranslation();
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedExpenseResponse | null>(null);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Editable fields when previewing parsed result
  const [editItem, setEditItem] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editType, setEditType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [editDate, setEditDate] = useState('');

  interface SpeechRecognizerInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  }

  const recognitionRef = useRef<SpeechRecognizerInstance | null>(null);

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechConstructor = (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognizerInstance;
        webkitSpeechRecognition?: new () => SpeechRecognizerInstance;
      }
    ).SpeechRecognition ||
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognizerInstance;
      }
    ).webkitSpeechRecognition;

    if (SpeechConstructor) {
      const recognizer = new SpeechConstructor();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = lang === 'en' ? 'en-US' : 'vi-VN';

      recognizer.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);
      };

      recognizer.onerror = (event: { error: string }) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }
  }, [lang]);

  function toggleListening() {
    if (!recognitionRef.current) {
      alert(t('naturalInput.voiceNotSupported'));
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      try {
        recognitionRef.current.lang = lang === 'en' ? 'en-US' : 'vi-VN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  }


  async function handleParse(inputOverride?: string) {
    const raw = (inputOverride !== undefined ? inputOverride : text).trim();
    if (!raw) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsParsing(true);
    setError('');
    setParsed(null);

    try {
      const res = await parseNaturalInput(raw);
      setParsed(res);
      setEditItem(res.item_name);
      setEditAmount(String(res.total_price));
      setEditCategory(res.category);
      setEditStore(res.store_name || '');
      setEditType(res.type);
      setEditDate(res.transaction_date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi AI phân tích');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirmSave() {
    if (!editItem.trim()) {
      setError('Tên giao dịch không được để trống');
      return;
    }
    const cleanAmount = Number(String(editAmount).replace(/[^0-9]/g, ''));
    if (!cleanAmount || cleanAmount <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await createTransaction({
        item_name: editItem.trim(),
        total_price: cleanAmount,
        category: editCategory || 'khac',
        store_name: editStore.trim() || null,
        type: editType,
        transaction_date: editDate,
      });

      setSuccessToast(t('naturalInput.successSaved'));
      setParsed(null);
      setText('');
      onSuccess();

      setTimeout(() => {
        setSuccessToast('');
      }, 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu giao dịch');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="card mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(168, 85, 247, 0.04) 100%), var(--bg-surface)',
        border: '1px solid var(--border-strong, var(--border))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {t('naturalInput.title')}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 10,
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
            }}
          >
            {t('naturalInput.badge')}
          </span>
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--error, #ef4444)',
              fontSize: 12,
              fontWeight: 600,
              animation: 'pulse 1.5s infinite',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--error, #ef4444)',
                display: 'inline-block',
              }}
            />
            <span>{t('naturalInput.voiceListening')}</span>
          </div>
        )}
      </div>

      {/* Input box with mic and submit */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="input"
            style={{
              paddingRight: 44,
              fontSize: 14,
              height: 44,
              background: 'var(--bg-surface-2)',
              borderColor: isListening ? 'var(--error)' : 'var(--border)',
            }}
            placeholder={t('naturalInput.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleParse();
              }
            }}
            disabled={isParsing || isSaving}
          />
          {/* Voice Mic Button */}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleListening}
            title={isListening ? 'Dừng ghi âm' : 'Nói để nhập bằng giọng nói'}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              color: isListening ? 'var(--error, #ef4444)' : 'var(--text-muted)',
              background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              borderRadius: '50%',
              width: 32,
              height: 32,
              padding: 0,
            }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleParse()}
          disabled={!text.trim() || isParsing || isSaving}
          style={{ height: 44, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {isParsing ? (
            <span>{t('naturalInput.analyzing')}</span>
          ) : (
            <>
              <Sparkles size={16} />
              <span>{t('naturalInput.actionParse')}</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Example Pills */}
      {!parsed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t('naturalInput.quickExamples')}</span>
          {(lang === 'vi' ? QUICK_EXAMPLES : [
            'Lunch pho 45k this morning',
            'Petrol 80k at gas station',
            'Bought new shirt 350k online',
            'Received project bonus 5m'
          ]).map((eg) => (
            <button
              key={eg}
              type="button"
              className="btn btn-ghost"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                height: 24,
                borderRadius: 12,
                background: 'var(--bg-surface-2)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              onClick={() => {
                setText(eg);
                void handleParse(eg);
              }}
            >
              {eg}
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--error-bg)',
            color: 'var(--error)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            marginTop: 12,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success notification */}
      {successToast && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--success, #10b981)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            marginTop: 12,
            fontWeight: 600,
          }}
        >
          <Check size={16} style={{ flexShrink: 0 }} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Parsed Result Preview Card */}
      {parsed && (
        <div
          className="animate-in"
          style={{
            marginTop: 14,
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--accent-muted, var(--border))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('naturalInput.previewTitle')}
              </span>
              {/* Type pill toggle */}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setEditType(editType === 'EXPENSE' ? 'INCOME' : 'EXPENSE')}
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  background: editType === 'INCOME' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: editType === 'INCOME' ? 'var(--success, #10b981)' : 'var(--error, #ef4444)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {editType === 'INCOME' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                <span>{editType === 'INCOME' ? t('naturalInput.typeIncome') : t('naturalInput.typeExpense')}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setParsed(null)}
                disabled={isSaving}
                style={{ fontSize: 12 }}
              >
                <X size={14} />
                <span>{t('naturalInput.cancel')}</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleConfirmSave}
                disabled={isSaving}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Check size={14} />
                <span>{isSaving ? t('naturalInput.saving') : t('naturalInput.saveNow')}</span>
              </button>
            </div>
          </div>

          {/* Form fields grid for preview/adjustment */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                {t('dashboard.colItem')}:
              </label>
              <input
                type="text"
                className="input"
                style={{ height: 34, fontSize: 13 }}
                value={editItem}
                onChange={(e) => setEditItem(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                {t('quickAdd.amount')}:
              </label>
              <input
                type="number"
                className="input"
                style={{ height: 34, fontSize: 13, fontWeight: 700 }}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                {t('dashboard.colCategory')}:
              </label>
              <select
                className="input"
                style={{ height: 34, fontSize: 13 }}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                {(editType === 'INCOME' ? getIncomeCategoryOptions(t) : getExpenseCategoryOptions(t)).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                {t('dashboard.colStore')}:
              </label>
              <input
                type="text"
                className="input"
                style={{ height: 34, fontSize: 13 }}
                placeholder={lang === 'vi' ? 'Tùy chọn' : 'Optional'}
                value={editStore}
                onChange={(e) => setEditStore(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Ngày:
              </label>
              <input
                type="date"
                className="input"
                style={{ height: 34, fontSize: 13 }}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
