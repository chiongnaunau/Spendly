'use client';
import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { getStats, getRecentTransactions, deleteTransaction, getBudget, setBudget, getInsights, getWallets } from '@/lib/api';
import type { Stats, Transaction, BudgetStatus, InsightsResponse, WalletsSummary } from '@/lib/types';
import { currentMonth, ALL_CATEGORY_OPTIONS, getAllCategoryOptions } from '@/lib/utils';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { TransactionTable } from '@/components/dashboard/TransactionTable';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';
import { BudgetCard } from '@/components/dashboard/BudgetCard';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { NaturalInputBar } from '@/components/dashboard/NaturalInputBar';
import { WalletManager } from '@/components/dashboard/WalletManager';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, AlertTriangle, Search, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudgetState] = useState<BudgetStatus | null>(null);
  const [insights, setInsightsState] = useState<InsightsResponse | null>(null);
  const [walletsSummary, setWalletsSummary] = useState<WalletsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const load = useCallback(async (targetMonth: string) => {
    if (!targetMonth) return;
    setLoading(true); setError('');
    try {
      const [s, tx, b, ins, w] = await Promise.all([
        getStats(targetMonth),
        getRecentTransactions(),
        getBudget(targetMonth).catch(() => null),
        getInsights(targetMonth).catch(() => null),
        getWallets().catch(() => null),
      ]);
      setStats(s); setTransactions(tx); setBudgetState(b); setInsightsState(ins); setWalletsSummary(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dashboard.loadError'));
    } finally { setLoading(false); }
  }, [t]);


  const handleUpdateBudget = useCallback(async (amount: number) => {
    if (!month) return;
    const updated = await setBudget(month, amount);
    setBudgetState(updated);
    // Reload insights after budget update to recalculate projection vs budget
    getInsights(month).then(setInsightsState).catch(() => null);
  }, [month]);

  const handleDeleteTransaction = useCallback(async (id: number) => {
    try {
      await deleteTransaction(id);
      await load(month || currentMonth());
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể xóa giao dịch');
    }
  }, [load, month]);

  useEffect(() => {
    let ignore = false;
    const m = currentMonth();
    startTransition(() => {
      setMonth(m);
    });
    void (async () => {
      if (!ignore) await load(m);
    })();
    return () => {
      ignore = true;
    };
  }, [load, user]);

  const totalCategories = stats ? Object.keys(stats.by_category).length : 0;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        tx.item_name.toLowerCase().includes(q) ||
        (tx.store_name && tx.store_name.toLowerCase().includes(q));
      
      if (selectedCategory === 'ALL') return matchesSearch;
      const opt = ALL_CATEGORY_OPTIONS.find(o => o.value === selectedCategory);
      const matchesCategory = opt ? opt.aliases.includes(tx.category) : tx.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategory]);

  return (
    <div className="animate-in">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')} — {month}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsQuickAddOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
            <span>{t('quickAdd.button')}</span>
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => void load(month || currentMonth())} title="Refresh" disabled={loading}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-6" style={{ borderColor:'var(--error)', borderLeftWidth:4, display:'flex', gap:12, alignItems:'center' }}>
          <AlertTriangle size={18} color="var(--error)" />
          <span style={{ fontSize: 14, color:'var(--text-secondary)' }}>{error}</span>
          <button className="btn btn-sm btn-secondary ml-auto" onClick={() => void load(month || currentMonth())}>Retry</button>
        </div>
      )}

      {/* Voice & Natural Language AI Quick Entry Bar */}
      <NaturalInputBar onSuccess={() => void load(month || currentMonth())} />

      {/* Stats row */}
      <div className="grid-4 mb-6">
        <StatsCard
          label={t('dashboard.totalSpent')}
          value={stats ? Number(stats.total) : 0}
          suffix=" ₫"
          delta={stats?.compare_last_month_pct ?? null}
          deltaLabel={t('dashboard.vsLastMonth')}
          accent
          isLoading={loading}
        />
        <StatsCard
          label={t('dashboard.totalIncome')}
          value={stats ? Number(stats.total_income || 0) : 0}
          suffix=" ₫"
          isLoading={loading}
        />
        <StatsCard
          label={t('dashboard.netCashflow')}
          value={stats ? Number(stats.net_cashflow || 0) : 0}
          suffix=" ₫"
          delta={stats?.savings_rate_pct ?? null}
          deltaLabel={stats?.savings_rate_pct !== null && stats?.savings_rate_pct !== undefined ? t('dashboard.savingsRate') : ''}
          isLoading={loading}
        />
        <StatsCard
          label={t('dashboard.transactions')}
          value={transactions.length}
          delta={totalCategories}
          deltaLabel={t('dashboard.categoriesCount')}
          isLoading={loading}
        />
      </div>

      {/* AI Proactive Insights & Forecast */}
      <AIInsightsCard insights={insights} isLoading={loading} />

      {/* Multi-Wallet Management */}
      <WalletManager
        summary={walletsSummary}
        isLoading={loading}
        onRefresh={() => void load(month || currentMonth())}
      />

      {/* Monthly Budget Card */}
      <BudgetCard budget={budget} isLoading={loading} onUpdate={handleUpdateBudget} />


      {/* Chart + Table */}
      <div className="grid-2 mb-6" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>{t('dashboard.categories')}</div>
          <CategoryChart data={stats?.by_category ?? {}} isLoading={loading} />
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>{t('dashboard.recentTx')}</div>
          <TransactionTable data={transactions.slice(0,5)} isLoading={loading} emptyMsg={t('dashboard.noTx')} onDelete={handleDeleteTransaction} />
        </div>
      </div>

      {/* Full tx table / History Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{t('dashboard.allTx')} ({transactions.length})</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 30, height: 36, fontSize: 13, width: 220 }}
                placeholder={t('dashboard.searchTx')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="input"
              style={{ height: 36, fontSize: 13, minWidth: 150 }}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">{t('dashboard.allCategories')}</option>
              {getAllCategoryOptions(t).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <TransactionTable data={filteredTransactions} isLoading={loading} emptyMsg={t('dashboard.noTx')} onDelete={handleDeleteTransaction} />
      </div>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => void load(month || currentMonth())}
        wallets={walletsSummary?.wallets ?? []}
      />
    </div>
  );
}

