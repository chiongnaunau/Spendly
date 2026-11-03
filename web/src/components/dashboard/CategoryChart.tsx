'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CHART_COLORS } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface CategoryChartProps {
  data: Record<string, string>;
  isLoading?: boolean;
}

export function CategoryChart({ data, isLoading }: CategoryChartProps) {
  const { t, getCategoryLabel } = useTranslation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
        {[80, 120, 60, 140, 90, 110].map((h, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: h }} />
        ))}
      </div>
    );
  }

  const chartData = Object.entries(data)
    .map(([cat, amt]) => ({ name: getCategoryLabel(cat), value: Number(amt) }))
    .sort((a, b) => b.value - a.value);

  if (!chartData.length) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 }}>
        {t('common.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v)
          }
        />
        <Tooltip
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
          formatter={(v: unknown) => [Number(v ?? 0).toLocaleString('vi-VN') + ' ₫', '']}
          cursor={{ fill: 'var(--bg-hover)' }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
