'use client';
import { useEffect, useRef, useState } from 'react';

interface StatsCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: number | null;
  deltaLabel?: string;
  accent?: boolean;
  isLoading?: boolean;
}

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = ref.current;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (target - start) * ease));
      if (p < 1) requestAnimationFrame(tick);
      else { ref.current = target; setVal(target); }
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

export function StatsCard({ label, value, prefix = '', suffix = '', delta, deltaLabel = '', accent, isLoading }: StatsCardProps) {
  const displayed = useCountUp(isLoading ? 0 : value);
  const absPct = delta !== null && delta !== undefined ? Math.abs(delta).toFixed(1) : null;
  const dir = delta !== null && delta !== undefined ? (delta > 0 ? 'up' : 'down') : '';
  const arrow = delta !== null && delta !== undefined ? (delta > 0 ? '↑' : '↓') : '';

  return (
    <div className={'stat-card' + (accent ? ' stat-card-accent' : '') + ' animate-in'}>
      {accent && <div className="stat-glow" />}
      <div className="stat-label">{label}</div>
      {isLoading ? (
        <div className="skeleton" style={{ height: 32, width: '60%', marginTop: 4 }} />
      ) : (
        <div className="stat-value">
          {prefix}{displayed.toLocaleString('vi-VN')}{suffix}
        </div>
      )}
      {absPct && !isLoading && (
        <div className={'stat-delta' + (dir ? ' ' + dir : '')}>
          <span>{arrow} {absPct}%</span>
          {deltaLabel && <span style={{ fontWeight: 400, opacity: .7 }}>{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
