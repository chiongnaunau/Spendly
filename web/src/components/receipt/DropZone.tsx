'use client';
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface DropZoneProps {
  onFile: (file: File) => void;
  isLoading?: boolean;
  label?: string;
  sublabel?: string;
  formats?: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';

export function DropZone({ onFile, isLoading, label, sublabel, formats }: DropZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);

  const displayLabel = label ?? t('receipt.chooseFile');
  const displaySublabel = sublabel ?? t('receipt.dragDrop');
  const displayFormats = formats ?? t('receipt.formats');

  function handleDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <div
      className={'dropzone ' + (isDragging ? 'dropzone-active' : '')}
      onClick={() => !isLoading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      role="button"
      aria-label="Upload receipt image"
      style={{ cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? .6 : 1 }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleChange} />
      <div style={{ marginBottom: 12, color: 'var(--accent)' }}>
        {isLoading ? <div className="spinner" style={{ margin: '0 auto' }} /> : isDragging ? <Upload size={40} /> : <ImageIcon size={40} />}
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
        {isLoading ? t('receipt.uploading') : displayLabel}
      </div>
      {!isLoading && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{displaySublabel}</div>}
      {!isLoading && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{displayFormats}</div>}
    </div>
  );
}
