import { useState, useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSites, useBankAccounts, useCashPosition, useDebtMaturity } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';

type TreasuryTab = 'cash' | 'debt';

function formatAmount(val: number): string {
  return new Intl.NumberFormat('en', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200/60 dark:bg-slate-700/60" />
            <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-200/60 dark:bg-slate-700/60" />
          </div>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        <div className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" style={{ width: `${120 + Math.random() * 150}px` }} />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/10">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    closed: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    frozen: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  const dots: Record<string, string> = {
    active: 'bg-emerald-500',
    closed: 'bg-slate-400',
    frozen: 'bg-red-500',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', colors[s] || colors.active)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dots[s] || dots.active)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function CashPositionTab({ siteId, date }: { siteId: string | null; date: string }) {
  const { t } = useTranslation();
  const { data: cashData, isLoading: cashLoading } = useCashPosition(siteId, date);
  const { data: accountsData, isLoading: accLoading } = useBankAccounts(siteId || '');

  if (cashLoading || accLoading) return <LoadingSkeleton />;

  const accounts = accountsData?.items ?? [];
  const position = cashData ?? {};

  const summaryCards = [
    { label: t('treasury.totalCash'), value: position.total_cash ?? 0 },
    { label: t('treasury.totalDeposits'), value: position.total_deposits ?? 0 },
    { label: t('treasury.totalCredit'), value: position.total_credit_lines ?? 0 },
    { label: t('treasury.netPosition'), value: position.net_position ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatAmount(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Bank Accounts Table */}
      {accounts.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <div className="glass-card overflow-hidden animate-in">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('treasury.bankAccounts')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.bankName')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.accountNumber')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.accountType')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.currency')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.balance')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc: any, idx: number) => (
                  <tr key={acc.id || idx} className="border-b border-slate-100/40 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20 transition-colors duration-150">
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{acc.bank_name || acc.bank}</td>
                    <td className="px-6 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">{acc.account_number || acc.iban || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{acc.account_type || acc.type || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{acc.currency || 'EUR'}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(acc.balance ?? 0)}</td>
                    <td className="px-6 py-3"><StatusBadge status={acc.status || 'active'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DebtProfileTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useDebtMaturity();

  if (isLoading) return <LoadingSkeleton />;

  const instruments = data?.instruments ?? data?.items ?? [];
  const profile = data?.maturity_profile ?? data?.profile ?? {};

  return (
    <div className="space-y-4">
      {/* Maturity Summary */}
      {Object.keys(profile).length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('treasury.totalDebt'), value: profile.total_debt ?? 0 },
            { label: t('treasury.shortTerm'), value: profile.short_term ?? 0 },
            { label: t('treasury.longTerm'), value: profile.long_term ?? 0 },
            { label: t('treasury.avgRate'), value: profile.weighted_avg_rate != null ? `${profile.weighted_avg_rate.toFixed(2)}%` : '-', raw: true },
          ].map((card, i) => (
            <div key={i} className="glass-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {card.raw ? card.value : formatAmount(card.value as number)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Debt Instruments Table */}
      {instruments.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <div className="glass-card overflow-hidden animate-in">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('treasury.debtInstruments')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.instrument')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.lender')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.principal')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.outstanding')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.rate')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.maturity')}</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((d: any, idx: number) => (
                  <tr key={d.id || idx} className="border-b border-slate-100/40 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20 transition-colors duration-150">
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{d.instrument_type || d.type || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{d.lender || d.bank || '-'}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(d.principal ?? d.original_amount ?? 0)}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(d.outstanding ?? d.balance ?? 0)}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{d.interest_rate != null ? `${d.interest_rate}%` : '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{d.maturity_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function TreasuryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TreasuryTab>('cash');
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const { data: sites } = useSites();

  const siteName = useMemo(() => {
    if (!selectedSiteId || !sites) return t('common.consolidated');
    return sites.find((s) => s.id === selectedSiteId)?.name ?? 'Unknown Site';
  }, [selectedSiteId, sites, t]);

  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

  const TAB_DEFS: { key: TreasuryTab; labelKey: string; icon: string }[] = [
    { key: 'cash', labelKey: 'treasury.cashTab', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'debt', labelKey: 'treasury.debtTab', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('treasury.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>

      <div className="flex gap-2">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'glass-card !rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
            </svg>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'cash' && <CashPositionTab siteId={selectedSiteId} date={dateStr} />}
      {activeTab === 'debt' && <DebtProfileTab />}
    </div>
  );
}
