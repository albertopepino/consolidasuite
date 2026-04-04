import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/store/dashboardStore';
import { apiClient } from '@/api/client';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import { formatVariance, formatPercentageCell } from '@/utils/conditionalFormat';
import { ExportButton } from '@/components/ui/ExportButton';

type AnalyticsTab = 'variance' | 'comparison' | 'trend';

const LINE_ITEM_NAMES: Record<string, string> = {
  REV: 'Revenue', COGS: 'Cost of Goods Sold', GP: 'Gross Profit',
  OPEX: 'Operating Expenses', EBIT: 'Operating Income (EBIT)',
  EBT: 'Earnings Before Tax', TAX: 'Income Tax', NI: 'Net Income',
  CA: 'Current Assets', CL: 'Current Liabilities', TA: 'Total Assets',
  TL: 'Total Liabilities', EQ: 'Total Equity',
  CFO: 'Net Cash from Operations', CFI: 'Net Cash from Investing',
  CFF: 'Net Cash from Financing', NET_CASH: 'Net Change in Cash',
};

function formatNum(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '--';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '--';
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return '--';
  return `${(val * 100).toFixed(1)}%`;
}

// Sparkline SVG for trend data
function Sparkline({ values }: { values: (number | null)[] }) {
  const filtered = values.filter((v): v is number => v !== null);
  if (filtered.length < 2) return <span className="text-slate-300">--</span>;

  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = filtered.map((v, i) => {
    const x = (i / (filtered.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const isUp = filtered[filtered.length - 1] >= filtered[0];

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variance Tab
// ---------------------------------------------------------------------------

function VarianceTab() {
  const { t } = useTranslation();
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);

  const endpoint = selectedSiteId
    ? `/analytics/variance/${selectedSiteId}`
    : '/analytics/variance/consolidated';

  const params: Record<string, string> = {
    period_year: String(selectedYear),
    period_month: String(selectedMonth),
  };
  if (!selectedSiteId) {
    params.target_currency = 'EUR';
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['variance', selectedSiteId, selectedYear, selectedMonth],
    queryFn: () => apiClient.get<any[]>(endpoint, params),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message={t('analytics.loadError')} />;
  if (!data || data.length === 0) return <EmptyState message={t('analytics.noVarianceData')} />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.lineItem')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.actual')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.budget')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.varianceAmt')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.variancePct')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => {
              const isRevenue = ['REV', 'GP', 'EBIT', 'EBT', 'NI'].includes(row.line_item);
              const varianceCls = row.variance_pct !== null
                ? formatVariance(row.variance_pct, isRevenue)
                : '';
              return (
                <tr key={row.line_item} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {LINE_ITEM_NAMES[row.line_item] || row.line_item}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatNum(row.actual)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatNum(row.budget)}
                  </td>
                  <td className={cn('px-5 py-3 text-right font-mono text-sm tabular-nums rounded', varianceCls)}>
                    {formatNum(row.variance_amount)}
                  </td>
                  <td className={cn('px-5 py-3 text-right font-mono text-sm tabular-nums rounded', varianceCls)}>
                    {formatPct(row.variance_pct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period Comparison Tab
// ---------------------------------------------------------------------------

function ComparisonTab() {
  const { t } = useTranslation();
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);

  // Compare current month vs previous month
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['comparison', selectedSiteId, selectedYear, selectedMonth],
    queryFn: () => {
      if (!selectedSiteId) return Promise.resolve([]);
      return apiClient.get<any[]>(`/analytics/period-comparison/${selectedSiteId}`, {
        year1: String(selectedYear),
        month1: String(selectedMonth),
        year2: String(prevYear),
        month2: String(prevMonth),
      });
    },
    enabled: !!selectedSiteId,
  });

  if (!selectedSiteId) return <EmptyState message={t('analytics.selectSiteComparison')} />;
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message={t('analytics.loadError')} />;
  if (!data || data.length === 0) return <EmptyState message={t('analytics.noComparisonData')} />;

  const period1Label = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const period2Label = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.lineItem')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{period1Label}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{period2Label}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.change')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('analytics.changePct')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => {
              const isRevenue = ['REV', 'GP', 'EBIT', 'EBT', 'NI'].includes(row.line_item);
              const changeCls = row.change_pct !== null
                ? formatVariance(row.change_pct, isRevenue)
                : '';
              return (
                <tr key={row.line_item} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {LINE_ITEM_NAMES[row.line_item] || row.line_item}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatNum(row.period1_amount)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatNum(row.period2_amount)}
                  </td>
                  <td className={cn('px-5 py-3 text-right font-mono text-sm tabular-nums rounded', changeCls)}>
                    {formatNum(row.change_amount)}
                  </td>
                  <td className={cn('px-5 py-3 text-right font-mono text-sm tabular-nums rounded', changeCls)}>
                    {formatPct(row.change_pct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend Tab
// ---------------------------------------------------------------------------

function TrendTab() {
  const { t } = useTranslation();
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);

  // 6-month trend ending at selected period
  const startMonth = selectedMonth <= 5 ? selectedMonth + 7 : selectedMonth - 5;
  const startYear = selectedMonth <= 5 ? selectedYear - 1 : selectedYear;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trend', selectedSiteId, selectedYear, selectedMonth],
    queryFn: () => {
      if (!selectedSiteId) return Promise.resolve([]);
      return apiClient.get<any[]>(`/analytics/trend/${selectedSiteId}`, {
        start_year: String(startYear),
        start_month: String(startMonth),
        months: '6',
      });
    },
    enabled: !!selectedSiteId,
  });

  if (!selectedSiteId) return <EmptyState message={t('analytics.selectSiteTrend')} />;
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message={t('analytics.loadError')} />;
  if (!data || data.length === 0) return <EmptyState message={t('analytics.noTrendData')} />;

  const kpiKeys = [
    { key: 'revenue', label: t('analytics.trendRevenue'), isCurrency: true },
    { key: 'gross_margin', label: t('analytics.trendGrossMargin'), isPct: true },
    { key: 'ebitda', label: t('analytics.trendEbitda'), isCurrency: true },
    { key: 'ebitda_margin', label: t('analytics.trendEbitdaMargin'), isPct: true },
    { key: 'net_income', label: t('analytics.trendNetIncome'), isCurrency: true },
    { key: 'net_profit_margin', label: t('analytics.trendNetMargin'), isPct: true },
    { key: 'current_ratio', label: t('analytics.trendCurrentRatio') },
    { key: 'working_capital', label: t('analytics.trendWorkingCapital'), isCurrency: true },
    { key: 'debt_equity', label: t('analytics.trendDebtEquity') },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 sticky left-0 bg-white dark:bg-slate-900">
                KPI
              </th>
              {data.map((d: any) => (
                <th key={d.month} className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {d.month}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {t('analytics.sparkline')}
              </th>
            </tr>
          </thead>
          <tbody>
            {kpiKeys.map(({ key, label, isCurrency, isPct }) => {
              const values = data.map((d: any) => d[key]);
              return (
                <tr key={key} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 whitespace-nowrap">
                    {label}
                  </td>
                  {values.map((val: number | null, idx: number) => {
                    const cellCls = isPct && val !== null ? formatPercentageCell(val) : '';
                    return (
                      <td key={idx} className={cn('px-4 py-3 text-right font-mono text-sm tabular-nums rounded', cellCls)}>
                        {isPct ? formatPct(val) : isCurrency ? formatNum(val) : (val !== null ? val.toFixed(2) : '--')}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <Sparkline values={values} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" style={{ width: `${120 + Math.random() * 150}px` }} />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/10">
        <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('variance');
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const TABS: { key: AnalyticsTab; label: string }[] = [
    { key: 'variance', label: t('analytics.varianceTab') },
    { key: 'comparison', label: t('analytics.comparisonTab') },
    { key: 'trend', label: t('analytics.trendTab') },
  ];

  return (
    <div className="page-enter space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('analytics.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('analytics.subtitle')}
          </p>
        </div>
        {selectedSiteId && (
          <ExportButton
            endpoint={`/export/financial-statements/${selectedSiteId}`}
            filename={`analytics_${selectedSiteId}`}
            params={{
              period_year: String(selectedYear),
              period_month: String(selectedMonth),
            }}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'variance' && <VarianceTab />}
      {activeTab === 'comparison' && <ComparisonTab />}
      {activeTab === 'trend' && <TrendTab />}
    </div>
  );
}
