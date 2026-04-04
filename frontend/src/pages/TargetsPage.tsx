import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSites, useTargets, useSaveTargets, useSiteKPIs, useConsolidatedKPIs } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/utils/cn';
import type { KPIResponse } from '@/types/kpi';

interface KPIDefinition {
  name: string;
  category: 'Profitability' | 'Liquidity' | 'Efficiency' | 'Leverage';
  apiCategory: 'profitability' | 'liquidity' | 'efficiency' | 'leverage';
}

const KPI_DEFINITIONS: KPIDefinition[] = [
  // Profitability
  { name: 'Revenue', category: 'Profitability', apiCategory: 'profitability' },
  { name: 'Gross Margin', category: 'Profitability', apiCategory: 'profitability' },
  { name: 'EBITDA', category: 'Profitability', apiCategory: 'profitability' },
  { name: 'EBITDA Margin', category: 'Profitability', apiCategory: 'profitability' },
  { name: 'Net Profit Margin', category: 'Profitability', apiCategory: 'profitability' },
  { name: 'Net Income', category: 'Profitability', apiCategory: 'profitability' },
  // Liquidity
  { name: 'Current Ratio', category: 'Liquidity', apiCategory: 'liquidity' },
  { name: 'Quick Ratio', category: 'Liquidity', apiCategory: 'liquidity' },
  { name: 'Cash Ratio', category: 'Liquidity', apiCategory: 'liquidity' },
  { name: 'Working Capital', category: 'Liquidity', apiCategory: 'liquidity' },
  { name: 'Cash & Bank', category: 'Liquidity', apiCategory: 'liquidity' },
  // Efficiency
  { name: 'AR Turnover', category: 'Efficiency', apiCategory: 'efficiency' },
  { name: 'Days Sales Outstanding', category: 'Efficiency', apiCategory: 'efficiency' },
  { name: 'Inventory Turnover', category: 'Efficiency', apiCategory: 'efficiency' },
  { name: 'AP Turnover', category: 'Efficiency', apiCategory: 'efficiency' },
  { name: 'Cash Conversion Cycle', category: 'Efficiency', apiCategory: 'efficiency' },
  // Leverage
  { name: 'Debt-to-Equity', category: 'Leverage', apiCategory: 'leverage' },
  { name: 'Debt-to-Assets', category: 'Leverage', apiCategory: 'leverage' },
  { name: 'Equity Ratio', category: 'Leverage', apiCategory: 'leverage' },
  { name: 'Interest Coverage', category: 'Leverage', apiCategory: 'leverage' },
];

const CATEGORIES = ['Profitability', 'Liquidity', 'Efficiency', 'Leverage'] as const;

const CATEGORY_STYLES: Record<string, {
  headerGradient: string;
  headerText: string;
  dot: string;
  borderAccent: string;
  chipBg: string;
  chipText: string;
}> = {
  Profitability: {
    headerGradient: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    headerText: 'text-white',
    dot: 'bg-emerald-400',
    borderAccent: 'border-l-emerald-500',
    chipBg: 'bg-emerald-500/10',
    chipText: 'text-emerald-600 dark:text-emerald-400',
  },
  Liquidity: {
    headerGradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    headerText: 'text-white',
    dot: 'bg-blue-400',
    borderAccent: 'border-l-blue-500',
    chipBg: 'bg-blue-500/10',
    chipText: 'text-blue-600 dark:text-blue-400',
  },
  Efficiency: {
    headerGradient: 'bg-gradient-to-r from-violet-500 to-violet-600',
    headerText: 'text-white',
    dot: 'bg-violet-400',
    borderAccent: 'border-l-violet-500',
    chipBg: 'bg-violet-500/10',
    chipText: 'text-violet-600 dark:text-violet-400',
  },
  Leverage: {
    headerGradient: 'bg-gradient-to-r from-amber-500 to-amber-600',
    headerText: 'text-white',
    dot: 'bg-amber-400',
    borderAccent: 'border-l-amber-500',
    chipBg: 'bg-amber-500/10',
    chipText: 'text-amber-600 dark:text-amber-400',
  },
};

function findKPIValue(kpis: KPIResponse | undefined, category: string, name: string): number | null {
  if (!kpis) return null;
  const cats = kpis[category as keyof Pick<KPIResponse, 'profitability' | 'liquidity' | 'efficiency' | 'leverage'>];
  if (!Array.isArray(cats)) return null;
  const item = cats.find((k) => k.name === name);
  if (!item || item.value === null) return null;
  return parseFloat(item.value);
}

function formatKPIValue(value: number | null, kpiName: string): string {
  if (value === null) return '--';
  const percentKPIs = ['Gross Margin', 'EBITDA Margin', 'Net Profit Margin', 'Equity Ratio'];
  const ratioKPIs = ['Current Ratio', 'Quick Ratio', 'Cash Ratio', 'AR Turnover', 'Inventory Turnover', 'AP Turnover', 'Debt-to-Equity', 'Debt-to-Assets', 'Interest Coverage'];
  const daysKPIs = ['Days Sales Outstanding', 'Cash Conversion Cycle'];

  if (percentKPIs.includes(kpiName)) return `${(value * 100).toFixed(1)}%`;
  if (ratioKPIs.includes(kpiName)) return value.toFixed(2);
  if (daysKPIs.includes(kpiName)) return `${value.toFixed(0)} days`;
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getStatus(currentValue: number | null, targetValue: string): 'on-track' | 'below-target' | 'no-data' {
  if (currentValue === null || !targetValue || targetValue === '') return 'no-data';
  const target = parseFloat(targetValue);
  if (isNaN(target)) return 'no-data';
  return currentValue >= target ? 'on-track' : 'below-target';
}

export function TargetsPage() {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [year, setYear] = useState(2025);
  const [targetValues, setTargetValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: targetsData, isLoading: targetsLoading } = useTargets(siteId, year);
  const { data: siteKPIs } = useSiteKPIs(siteId || '', year, selectedMonth);
  const { data: consolidatedKPIs } = useConsolidatedKPIs(year, selectedMonth);
  const saveMutation = useSaveTargets();

  const kpiData = siteId ? siteKPIs : consolidatedKPIs;

  // Populate target values from API response
  useEffect(() => {
    if (targetsData?.items) {
      const vals: Record<string, string> = {};
      for (const item of targetsData.items) {
        vals[item.kpi_name] = String(item.target_value);
      }
      setTargetValues(vals);
    } else {
      setTargetValues({});
    }
  }, [targetsData]);

  const handleTargetChange = useCallback((kpiName: string, value: string) => {
    setTargetValues((prev) => ({ ...prev, [kpiName]: value }));
    setSaveMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const targets = Object.entries(targetValues)
        .filter(([, value]) => value !== '' && !isNaN(parseFloat(value)))
        .map(([kpiName, value]) => {
          const def = KPI_DEFINITIONS.find((d) => d.name === kpiName);
          return {
            site_id: siteId,
            kpi_name: kpiName,
            kpi_category: def?.apiCategory || 'profitability',
            target_value: parseFloat(value),
            period_year: year,
            period_month: null,
          };
        });
      await saveMutation.mutateAsync(targets);
      setSaveMessage({ type: 'success', text: t('targets.saved') });
    } catch {
      setSaveMessage({ type: 'error', text: t('targets.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  }, [targetValues, siteId, year, saveMutation, t]);

  const kpisByCategory = useMemo(() => {
    const grouped: Record<string, KPIDefinition[]> = {};
    for (const cat of CATEGORIES) {
      grouped[cat] = KPI_DEFINITIONS.filter((k) => k.category === cat);
    }
    return grouped;
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    let totalTracked = 0;
    let onTrack = 0;
    let belowTarget = 0;
    for (const kpi of KPI_DEFINITIONS) {
      const currentValue = findKPIValue(kpiData, kpi.apiCategory, kpi.name);
      const targetVal = targetValues[kpi.name] || '';
      const status = getStatus(currentValue, targetVal);
      if (status !== 'no-data') {
        totalTracked++;
        if (status === 'on-track') onTrack++;
        if (status === 'below-target') belowTarget++;
      }
    }
    return { totalTracked, onTrack, belowTarget };
  }, [kpiData, targetValues]);

  return (
    <div className="min-h-screen animate-in">
      {/* ── Gradient Header ─────────────────────────────────────────────── */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-r from-[#1a6fb5] via-[#1a8f85] to-[#34c759] px-8 pb-8 pt-10 shadow-xl shadow-[#1a6fb5]/10">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            {t('targets.title')}
          </h1>
          <p className="mt-1.5 text-sm text-white/70">
            {t('targets.subtitle')}
          </p>

          {/* Pill selectors on gradient */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <select
              value={siteId || ''}
              onChange={(e) => setSiteId(e.target.value || null)}
              className="appearance-none rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white shadow-inner backdrop-blur-sm transition-all placeholder:text-white/50 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/25"
            >
              <option value="" className="text-slate-900">{t('targets.overallAllSites')}</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id} className="text-slate-900">{site.name}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white shadow-inner backdrop-blur-sm transition-all focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/25"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="text-slate-900">{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total KPIs tracked */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all hover:shadow-xl dark:border-white/5 dark:bg-slate-800/50 dark:shadow-slate-900/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/10 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            KPIs Tracked
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            {stats.totalTracked}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">of {KPI_DEFINITIONS.length} defined</p>
        </div>

        {/* On Track */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/40 bg-white/60 p-5 shadow-lg shadow-emerald-100/30 backdrop-blur-xl transition-all hover:shadow-xl dark:border-emerald-500/10 dark:bg-slate-800/50 dark:shadow-emerald-900/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t('targets.onTrack')}
            </p>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.onTrack}
          </p>
        </div>

        {/* Below Target */}
        <div className="group relative overflow-hidden rounded-2xl border border-red-200/40 bg-white/60 p-5 shadow-lg shadow-red-100/30 backdrop-blur-xl transition-all hover:shadow-xl dark:border-red-500/10 dark:bg-slate-800/50 dark:shadow-red-900/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-red-500/10 to-transparent" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              {t('targets.belowTarget')}
            </p>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-red-600 dark:text-red-400">
            {stats.belowTarget}
          </p>
        </div>
      </div>

      {/* ── Save message toast ──────────────────────────────────────────── */}
      {saveMessage && (
        <div
          className={cn(
            'mb-6 rounded-xl px-5 py-3.5 text-sm font-medium shadow-sm',
            saveMessage.type === 'success'
              ? 'border border-emerald-200/50 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'border border-red-200/50 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400'
          )}
        >
          {saveMessage.text}
        </div>
      )}

      {/* ── Loading state ───────────────────────────────────────────────── */}
      {targetsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading targets...</span>
          </div>
        </div>
      ) : (
        /* ── Category Sections ────────────────────────────────────────── */
        <div className="space-y-8">
          {CATEGORIES.map((category) => {
            const kpis = kpisByCategory[category];
            const style = CATEGORY_STYLES[category];
            return (
              <div
                key={category}
                className="overflow-hidden rounded-2xl border border-white/20 bg-white/60 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-white/5 dark:bg-slate-800/40 dark:shadow-slate-900/20"
              >
                {/* Colored header strip */}
                <div className={cn('flex items-center gap-3 px-6 py-4', style.headerGradient)}>
                  <div className={cn('h-2.5 w-2.5 rounded-full', style.dot, 'ring-2 ring-white/30')} />
                  <h3 className={cn('font-display text-base font-bold', style.headerText)}>
                    {category}
                  </h3>
                  <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white/90">
                    {kpis.length} KPIs
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700/50">
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          KPI
                        </th>
                        <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {t('targets.currentValue')}
                        </th>
                        <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {t('targets.target')}
                        </th>
                        <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {t('targets.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.map((kpi, rowIdx) => {
                        const currentValue = findKPIValue(kpiData, kpi.apiCategory, kpi.name);
                        const targetVal = targetValues[kpi.name] || '';
                        const status = getStatus(currentValue, targetVal);
                        return (
                          <tr
                            key={kpi.name}
                            className="group border-b border-slate-50 transition-all duration-200 hover:bg-slate-50/80 dark:border-slate-700/30 dark:hover:bg-slate-700/20"
                            style={{ animationDelay: `${rowIdx * 40}ms` }}
                          >
                            {/* KPI Name */}
                            <td className="px-6 py-3.5">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {kpi.name}
                              </span>
                            </td>

                            {/* Current Value chip */}
                            <td className="px-6 py-3.5 text-center">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-3 py-1 font-mono text-xs font-semibold tabular-nums',
                                  currentValue !== null
                                    ? cn(style.chipBg, style.chipText)
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500'
                                )}
                              >
                                {formatKPIValue(currentValue, kpi.name)}
                              </span>
                            </td>

                            {/* Target input */}
                            <td className="px-6 py-3.5 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={targetVal}
                                onChange={(e) => handleTargetChange(kpi.name, e.target.value)}
                                placeholder="--"
                                className="mx-auto block w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center font-mono text-sm tabular-nums text-slate-700 shadow-sm transition-all placeholder:text-slate-300 focus:border-[#1a6fb5] focus:ring-2 focus:ring-[#1a6fb5]/20 focus:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:placeholder:text-slate-600 dark:focus:border-[#1a8f85] dark:focus:ring-[#1a8f85]/20"
                              />
                            </td>

                            {/* Status */}
                            <td className="px-6 py-3.5 text-center">
                              {status === 'on-track' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <svg className="h-4 w-4 animate-[bounce_1s_ease-in-out_1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {t('targets.onTrack')}
                                </span>
                              )}
                              {status === 'below-target' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                  <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                                  </span>
                                  {t('targets.belowTarget')}
                                </span>
                              )}
                              {status === 'no-data' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400 dark:bg-slate-700/50 dark:text-slate-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  --
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Save FAB ───────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="fixed bottom-8 right-8 z-50 inline-flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-r from-[#1a6fb5] to-[#34c759] px-7 text-sm font-bold text-white shadow-2xl shadow-[#1a6fb5]/30 transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_rgba(26,111,181,0.4)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSaving ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('targets.saving')}
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('targets.saveAll')}
          </>
        )}
      </button>
    </div>
  );
}
