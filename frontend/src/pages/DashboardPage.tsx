import { useMemo, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAuthStore } from '@/store/authStore';
import { useSiteKPIs, useConsolidatedKPIs } from '@/api/hooks';
import { KPICard } from '@/components/dashboard/KPICard';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { formatCurrency, formatPercent, formatRatio } from '@/utils/formatters';
import { useTranslation } from '@/i18n/useTranslation';
import type { KPIResponse, KPICardData } from '@/types/kpi';

const ALL_KPI_OPTIONS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'gross-margin', label: 'Gross Margin' },
  { id: 'ebitda', label: 'EBITDA' },
  { id: 'net-margin', label: 'Net Profit Margin' },
  { id: 'current-ratio', label: 'Current Ratio' },
  { id: 'working-capital', label: 'Working Capital' },
  { id: 'debt-equity', label: 'Debt / Equity' },
  { id: 'cash', label: 'Cash & Bank' },
];

const ALL_WIDGET_OPTIONS = [
  { id: 'revenue-trend', label: 'Revenue Trend' },
  { id: 'profitability', label: 'Profitability Margins' },
  { id: 'working-capital', label: 'Working Capital' },
  { id: 'ar-ap', label: 'AR vs AP Turnover' },
  { id: 'cash-flow', label: 'Cash & Bank Balance' },
  { id: 'expense-breakdown', label: 'Revenue Composition' },
];

function findKPI(kpis: KPIResponse, category: string, name: string): number {
  const cats = kpis[category as keyof Pick<KPIResponse, 'profitability' | 'liquidity' | 'efficiency' | 'leverage'>];
  if (!Array.isArray(cats)) return 0;
  const item = cats.find((k) => k.name === name);
  if (!item || item.value === null) return 0;
  return parseFloat(item.value);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ── Gradient KPI Card (top row - bold colored backgrounds) ─────────── */
function GradientKPICard({ data, index }: { data: KPICardData; index: number }) {
  const gradients: Record<string, string> = {
    'revenue':      'from-brand-700 to-brand-500',
    'gross-margin': 'from-emerald-600 to-emerald-500',
    'ebitda':       'from-teal-600 to-cyan-500',
    'net-margin':   'from-violet-600 to-violet-500',
  };
  const gradient = gradients[data.id] || gradients['revenue'];

  return (
    <div
      className={`gradient-card group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Decorative blur orb */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5 blur-xl" />

      <p className="relative text-xs font-semibold uppercase tracking-widest text-white/70">
        {data.label}
      </p>
      <p className="relative mt-2 text-3xl font-bold tracking-tight font-display">
        {data.formattedValue}
      </p>
      {data.changePercent !== undefined && (
        <div className="relative mt-3 flex items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
            (data.changeDirection === 'up') === data.isPositiveGood
              ? 'bg-white/20 text-emerald-200'
              : 'bg-white/20 text-red-200'
          }`}>
            {data.changeDirection === 'up' ? '+' : ''}{data.changePercent.toFixed(1)}%
          </span>
          <span className="text-[11px] text-white/50">vs prev.</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const [showCustomize, setShowCustomize] = useState(false);
  const user = useAuthStore((s) => s.user);
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const currencyMode = useDashboardStore((s) => s.currencyMode);
  const visibleKPIs = useDashboardStore((s) => s.visibleKPIs);
  const visibleWidgets = useDashboardStore((s) => s.visibleWidgets);
  const setVisibleKPIs = useDashboardStore((s) => s.setVisibleKPIs);
  const setVisibleWidgets = useDashboardStore((s) => s.setVisibleWidgets);

  const { data: siteKPIs, isLoading: siteLoading } = useSiteKPIs(
    selectedSiteId || '', selectedYear, selectedMonth
  );
  const { data: consolidatedKPIs, isLoading: consolidatedLoading } = useConsolidatedKPIs(
    selectedYear, selectedMonth
  );

  const kpiData = selectedSiteId ? siteKPIs : consolidatedKPIs;
  const isLoading = selectedSiteId ? siteLoading : consolidatedLoading;
  const currency = currencyMode === 'EUR' ? 'EUR' : (kpiData?.currency || 'EUR');

  const kpiCards: KPICardData[] = useMemo(() => {
    if (!kpiData) return [];

    const revenue = findKPI(kpiData, 'profitability', 'Revenue');
    const grossMargin = findKPI(kpiData, 'profitability', 'Gross Margin');
    const ebitda = findKPI(kpiData, 'profitability', 'EBITDA');
    const netMargin = findKPI(kpiData, 'profitability', 'Net Profit Margin');
    const currentRatio = findKPI(kpiData, 'liquidity', 'Current Ratio');
    const workingCapital = findKPI(kpiData, 'liquidity', 'Working Capital');
    const debtEquity = findKPI(kpiData, 'leverage', 'Debt-to-Equity');
    const cash = findKPI(kpiData, 'liquidity', 'Cash & Bank');

    return [
      {
        id: 'revenue', label: t('kpi.revenue'), value: revenue,
        formattedValue: formatCurrency(revenue, currency, { compact: true }),
        isPositiveGood: true, unit: 'currency', icon: 'revenue', color: 'blue',
      },
      {
        id: 'gross-margin', label: t('kpi.grossMargin'), value: grossMargin * 100,
        formattedValue: formatPercent(grossMargin * 100),
        isPositiveGood: true, unit: 'percent', icon: 'profit', color: 'emerald',
      },
      {
        id: 'ebitda', label: t('kpi.ebitda'), value: ebitda,
        formattedValue: formatCurrency(ebitda, currency, { compact: true }),
        isPositiveGood: true, unit: 'currency', icon: 'cash', color: 'cyan',
      },
      {
        id: 'net-margin', label: t('kpi.netProfitMargin'), value: netMargin * 100,
        formattedValue: formatPercent(netMargin * 100),
        isPositiveGood: true, unit: 'percent', icon: 'growth', color: 'violet',
      },
      {
        id: 'current-ratio', label: t('kpi.currentRatio'), value: currentRatio,
        formattedValue: formatRatio(currentRatio),
        isPositiveGood: true, unit: 'ratio', icon: 'ratio', color: 'cyan',
        benchmark: 2.0,
      },
      {
        id: 'working-capital', label: t('kpi.workingCapital'), value: workingCapital,
        formattedValue: formatCurrency(workingCapital, currency, { compact: true }),
        isPositiveGood: true, unit: 'currency', icon: 'cash', color: 'violet',
      },
      {
        id: 'debt-equity', label: t('kpi.debtEquity'), value: debtEquity,
        formattedValue: formatRatio(debtEquity),
        isPositiveGood: false, unit: 'ratio', icon: 'expense', color: 'amber',
        benchmark: 1.5,
      },
      {
        id: 'cash', label: t('kpi.cashBank'), value: cash,
        formattedValue: formatCurrency(cash, currency, { compact: true }),
        isPositiveGood: true, unit: 'currency', icon: 'revenue', color: 'blue',
      },
    ];
  }, [kpiData, currency, t]);

  const periodLabel = new Date(selectedYear, selectedMonth - 1)
    .toLocaleString('en', { month: 'long', year: 'numeric' });

  const filteredKPICards = useMemo(
    () => kpiCards.filter((kpi) => visibleKPIs.includes(kpi.id)),
    [kpiCards, visibleKPIs]
  );

  // Split into gradient row (first 4) and glass row (last 4)
  const gradientCards = filteredKPICards.filter((k) =>
    ['revenue', 'gross-margin', 'ebitda', 'net-margin'].includes(k.id)
  );
  const glassCards = filteredKPICards.filter((k) =>
    ['current-ratio', 'working-capital', 'debt-equity', 'cash'].includes(k.id)
  );

  function toggleKPI(id: string) {
    setVisibleKPIs(
      visibleKPIs.includes(id)
        ? visibleKPIs.filter((k) => k !== id)
        : [...visibleKPIs, id]
    );
  }

  function toggleWidget(id: string) {
    setVisibleWidgets(
      visibleWidgets.includes(id)
        ? visibleWidgets.filter((w) => w !== id)
        : [...visibleWidgets, id]
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || '';
  const siteName = selectedSiteId ? kpiData?.site_name : t('dashboard.consolidated');

  // Hero highlight values
  const heroRevenue = kpiCards.find((k) => k.id === 'revenue')?.formattedValue || '--';
  const heroNetMargin = kpiCards.find((k) => k.id === 'net-margin')?.formattedValue || '--';
  const heroEbitda = kpiCards.find((k) => k.id === 'ebitda')?.formattedValue || '--';

  return (
    <div className="page-enter space-y-8">

      {/* ═══════════════════════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-600 px-8 py-8 text-white shadow-2xl shadow-brand-900/20">
        {/* Decorative blur circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {/* Left: Greeting */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-display text-white md:text-3xl">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {siteName} &mdash; {periodLabel}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t('dashboard.dataRefreshed')}
            </div>
          </div>

          {/* Right: Hero highlight numbers */}
          <div className="flex gap-8 md:gap-12 stagger-children">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{t('kpi.revenue')}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight font-display md:text-3xl font-mono tabular-nums">{heroRevenue}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{t('kpi.netProfitMargin')}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight font-display md:text-3xl font-mono tabular-nums">{heroNetMargin}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{t('kpi.ebitda')}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight font-display md:text-3xl font-mono tabular-nums">{heroEbitda}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PRIMARY KPI CARDS (Gradient backgrounds)
          ═══════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 stagger-children">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 p-6 dark:from-slate-800 dark:to-slate-700"
            >
              <div className="h-3 w-20 animate-pulse rounded-md bg-slate-300/50 dark:bg-slate-600/50" />
              <div className="mt-4 h-8 w-28 animate-pulse rounded-md bg-slate-300/50 dark:bg-slate-600/50" />
            </div>
          ))}
        </div>
      ) : gradientCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 stagger-children">
          {gradientCards.map((kpi, index) => (
            <GradientKPICard key={kpi.id} data={kpi} index={index} />
          ))}
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
          SECONDARY KPI CARDS (Glass with accent bar)
          ═══════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 stagger-children">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-700/50" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="h-3 w-16 animate-pulse rounded-md bg-slate-200/50 dark:bg-slate-700/50" />
                  <div className="h-7 w-24 animate-pulse rounded-md bg-slate-200/50 dark:bg-slate-700/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : glassCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 stagger-children">
          {glassCards.map((kpi, index) => (
            <KPICard key={kpi.id} data={kpi} index={index + 4} />
          ))}
        </div>
      ) : null}

      {/* Empty state when no data at all */}
      {!isLoading && filteredKPICards.length === 0 && (
        <div className="glass-card border-dashed p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold font-display text-slate-700 dark:text-slate-300">No financial data</h3>
          <p className="mt-1 text-sm text-slate-500">Select a period with uploaded financial statements (Jul-Dec 2025)</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CHARTS SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-xl font-bold font-display bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent dark:from-blue-300 dark:to-teal-300">
            {t('dashboard.performanceOverview')}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
        </div>
        <DashboardGrid />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FLOATING ACTION BUTTON - Customize
          ═══════════════════════════════════════════════════════════════ */}
      <button
        onClick={() => setShowCustomize(true)}
        className="btn-primary fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center !rounded-2xl !p-0 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95"
        title={t('dashboard.customize')}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>

      {/* ═══════════════════════════════════════════════════════════════
          CUSTOMIZATION MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showCustomize && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCustomize(false)}
        >
          <div
            className="mx-4 w-full max-w-lg glass-card p-6"
            style={{ animation: 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold font-display text-slate-900 dark:text-white">{t('dashboard.customize')}</h2>
              <button
                onClick={() => setShowCustomize(false)}
                className="btn-ghost !p-1.5 !rounded-xl"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* KPI Cards Section */}
              <div>
                <h3 className="input-label font-display">
                  {t('dashboard.kpiCards')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_KPI_OPTIONS.map((kpi) => (
                    <label
                      key={kpi.id}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200/40 px-3 py-2.5 cursor-pointer transition-all duration-150 hover:bg-slate-50/60 dark:border-slate-600/30 dark:hover:bg-slate-700/40"
                    >
                      <input
                        type="checkbox"
                        checked={visibleKPIs.includes(kpi.id)}
                        onChange={() => toggleKPI(kpi.id)}
                        className="h-4 w-4 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{kpi.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chart Widgets Section */}
              <div>
                <h3 className="input-label font-display">
                  {t('dashboard.chartWidgets')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_WIDGET_OPTIONS.map((widget) => (
                    <label
                      key={widget.id}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200/40 px-3 py-2.5 cursor-pointer transition-all duration-150 hover:bg-slate-50/60 dark:border-slate-600/30 dark:hover:bg-slate-700/40"
                    >
                      <input
                        type="checkbox"
                        checked={visibleWidgets.includes(widget.id)}
                        onChange={() => toggleWidget(widget.id)}
                        className="h-4 w-4 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{widget.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setVisibleKPIs(ALL_KPI_OPTIONS.map((k) => k.id));
                  setVisibleWidgets(ALL_WIDGET_OPTIONS.map((w) => w.id));
                }}
                className="btn-glass"
              >
                {t('dashboard.resetDefault')}
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="btn-primary"
              >
                {t('dashboard.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
