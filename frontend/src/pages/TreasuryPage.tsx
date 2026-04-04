import { useState, useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSites, useBankAccounts, useCashPosition, useDebtMaturity } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';

type TreasuryTab = 'cash' | 'debt';

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '\uD83C\uDDFA\uD83C\uDDF8',
  EUR: '\uD83C\uDDEA\uD83C\uDDFA',
  GBP: '\uD83C\uDDEC\uD83C\uDDE7',
  CHF: '\uD83C\uDDE8\uD83C\uDDED',
  JPY: '\uD83C\uDDEF\uD83C\uDDF5',
  CNY: '\uD83C\uDDE8\uD83C\uDDF3',
  CAD: '\uD83C\uDDE8\uD83C\uDDE6',
  AUD: '\uD83C\uDDE6\uD83C\uDDFA',
  SEK: '\uD83C\uDDF8\uD83C\uDDEA',
  NOK: '\uD83C\uDDF3\uD83C\uDDF4',
  DKK: '\uD83C\uDDE9\uD83C\uDDF0',
  PLN: '\uD83C\uDDF5\uD83C\uDDF1',
  CZK: '\uD83C\uDDE8\uD83C\uDDFF',
  HUF: '\uD83C\uDDED\uD83C\uDDFA',
  RON: '\uD83C\uDDF7\uD83C\uDDF4',
  BGN: '\uD83C\uDDE7\uD83C\uDDEC',
  HRK: '\uD83C\uDDED\uD83C\uDDF7',
  TRY: '\uD83C\uDDF9\uD83C\uDDF7',
  MAD: '\uD83C\uDDF2\uD83C\uDDE6',
  ZAR: '\uD83C\uDDFF\uD83C\uDDE6',
  BRL: '\uD83C\uDDE7\uD83C\uDDF7',
  MXN: '\uD83C\uDDF2\uD83C\uDDFD',
  SGD: '\uD83C\uDDF8\uD83C\uDDEC',
  HKD: '\uD83C\uDDED\uD83C\uDDF0',
  INR: '\uD83C\uDDEE\uD83C\uDDF3',
  KRW: '\uD83C\uDDF0\uD83C\uDDF7',
};

const MATURITY_BANDS = [
  { key: '0_1y', label: '0-1Y', color: 'from-red-400 to-red-500', bg: 'bg-red-500' },
  { key: '1_3y', label: '1-3Y', color: 'from-amber-400 to-amber-500', bg: 'bg-amber-500' },
  { key: '3_5y', label: '3-5Y', color: 'from-blue-400 to-blue-500', bg: 'bg-blue-500' },
  { key: '5y_plus', label: '5Y+', color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-500' },
];

function formatAmount(val: number): string {
  return new Intl.NumberFormat('en', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function formatCompact(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return formatAmount(val);
}

function maskAccount(acc: string): string {
  if (!acc || acc.length < 6) return acc || '-';
  return '\u2022\u2022\u2022\u2022 ' + acc.slice(-4);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 p-10 dark:from-slate-700 dark:to-slate-800">
        <div className="h-4 w-24 animate-pulse rounded-full bg-white/30" />
        <div className="mt-4 h-10 w-56 animate-pulse rounded-full bg-white/30" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
            <div className="mt-4 h-7 w-32 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
        <svg className="h-8 w-8 text-slate-400 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Cash Position Tab
// ────────────────────────────────────────────────────────────────────────────

function CashPositionTab({ siteId, date }: { siteId: string | null; date: string }) {
  const { t } = useTranslation();
  const { data: cashData, isLoading: cashLoading } = useCashPosition(siteId, date);
  const { data: accountsData, isLoading: accLoading } = useBankAccounts(siteId || '');

  if (cashLoading || accLoading) return <LoadingSkeleton />;

  const accounts = accountsData?.items ?? [];
  const position = cashData ?? {};
  const totalCash = position.total_cash ?? 0;

  return (
    <div className="space-y-8 stagger-children">
      {/* Cash position hero */}
      <div className="gradient-card relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-8 py-10 shadow-xl shadow-emerald-900/20">
        <div className="absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute right-32 bottom-4 h-20 w-20 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-100/60">{t('treasury.totalCash')}</p>
          <p className="mt-2 text-4xl font-bold font-mono tabular-nums text-white lg:text-5xl">
            {formatAmount(totalCash)}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: t('treasury.totalDeposits'), value: position.total_deposits ?? 0 },
              { label: t('treasury.totalCredit'), value: position.total_credit_lines ?? 0 },
              { label: t('treasury.netPosition'), value: position.net_position ?? 0 },
            ].map((m, i) => (
              <div key={i} className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 transition-all duration-300 hover:bg-white/15">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-100/60">{m.label}</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-white">{formatCompact(m.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bank Accounts as cards */}
      {accounts.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">{t('treasury.bankAccounts')}</h2>
            <span className="pill-slate">{accounts.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc: any, idx: number) => {
              const currency = acc.currency || 'EUR';
              const flag = CURRENCY_FLAGS[currency] || '\uD83C\uDFF3\uFE0F';
              const status = (acc.status || 'active').toLowerCase();
              const isActive = status === 'active';

              return (
                <div
                  key={acc.id || idx}
                  className="glass-card group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-lg dark:from-slate-700 dark:to-slate-800">
                          {flag}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{acc.bank_name || acc.bank}</h3>
                          <p className="text-xs font-mono tracking-wider text-slate-400 dark:text-slate-500">{maskAccount(acc.account_number || acc.iban)}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1',
                        isActive ? 'pill-green' : 'pill-slate'
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {status}
                      </span>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('treasury.balance')}</p>
                        <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatAmount(acc.balance ?? 0)}
                        </p>
                      </div>
                      <span className="pill-slate">{currency}</span>
                    </div>
                  </div>

                  {/* Bottom accent bar */}
                  <div className={cn(
                    'h-1 w-full',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
                  )} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Debt Profile Tab
// ────────────────────────────────────────────────────────────────────────────

function MaturityTimeline({ profile }: { profile: any }) {
  const buckets = MATURITY_BANDS.map((band) => ({
    ...band,
    value: profile[band.key] ?? 0,
  }));
  const total = buckets.reduce((s, b) => s + b.value, 0);
  if (total <= 0) return null;

  return (
    <div className="glass-card overflow-hidden p-6">
      <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 mb-5">Maturity Timeline</h3>

      {/* Stacked bar */}
      <div className="flex h-8 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        {buckets.map((b) => {
          const pct = (b.value / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={b.key}
              className={cn('h-full bg-gradient-to-r transition-all duration-700', b.color)}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${formatAmount(b.value)}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-3">
            <div className={cn('h-3 w-3 rounded-full', b.bg)} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{b.label}</p>
              <p className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">{formatCompact(b.value)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DebtProfileTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useDebtMaturity();

  if (isLoading) return <LoadingSkeleton />;

  const instruments = data?.instruments ?? data?.items ?? [];
  const profile = data?.maturity_profile ?? data?.profile ?? {};

  const summaryDefs = [
    { label: t('treasury.totalDebt'), value: profile.total_debt ?? 0, gradient: 'from-red-500 to-rose-600', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
    { label: t('treasury.shortTerm'), value: profile.short_term ?? 0, gradient: 'from-amber-500 to-orange-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: t('treasury.longTerm'), value: profile.long_term ?? 0, gradient: 'from-blue-500 to-indigo-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: t('treasury.avgRate'), value: profile.weighted_avg_rate != null ? `${profile.weighted_avg_rate.toFixed(2)}%` : '-', gradient: 'from-violet-500 to-purple-600', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', raw: true },
  ];

  return (
    <div className="space-y-8 stagger-children">
      {/* Summary cards */}
      {Object.keys(profile).length > 0 && (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {summaryDefs.map((card, i) => (
            <div
              key={i}
              className={cn(
                'gradient-card group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl',
                card.gradient
              )}
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150" />
              <svg className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
              </svg>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-white/70">{card.label}</p>
              <p className="mt-1 text-2xl font-bold font-display font-mono tabular-nums">
                {card.raw ? card.value : formatAmount(card.value as number)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Maturity timeline visualization */}
      <MaturityTimeline profile={profile} />

      {/* Debt instruments as glass cards */}
      {instruments.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">{t('treasury.debtInstruments')}</h2>
            <span className="pill-slate">{instruments.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {instruments.map((d: any, idx: number) => {
              const rate = d.interest_rate;
              return (
                <div
                  key={d.id || idx}
                  className="glass-card group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="pill-violet">
                          {d.instrument_type || d.type || '-'}
                        </span>
                        <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">{d.lender || d.bank || '-'}</h3>
                      </div>
                      {rate != null && (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
                          <span className="text-sm font-bold font-mono tabular-nums text-white">{rate}%</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.principal')}</p>
                        <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatAmount(d.principal ?? d.original_amount ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('treasury.outstanding')}</p>
                        <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatAmount(d.outstanding ?? d.balance ?? 0)}
                        </p>
                      </div>
                    </div>

                    {d.maturity_date && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('ic.maturity')}: {d.maturity_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-violet-400 to-purple-500" />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────

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
    <div className="page-enter space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
          {t('treasury.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>

      {/* Segmented control tabs */}
      <div className="segmented-control">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200',
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
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
