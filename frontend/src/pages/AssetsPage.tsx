import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSites, useAssets, useAssetSummary } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';

const CATEGORY_ICONS: Record<string, string> = {
  buildings: '\uD83C\uDFE2',
  machinery: '\u2699\uFE0F',
  vehicles: '\uD83D\uDE9A',
  furniture: '\uD83E\uDE91',
  it_equipment: '\uD83D\uDCBB',
  land: '\uD83C\uDF33',
  intangible: '\uD83D\uDCA1',
};

const CATEGORY_COLORS: Record<string, { badge: string; bar: string }> = {
  buildings: { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', bar: 'from-blue-400 to-blue-600' },
  machinery: { badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', bar: 'from-violet-400 to-violet-600' },
  vehicles: { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bar: 'from-amber-400 to-amber-600' },
  furniture: { badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', bar: 'from-slate-400 to-slate-500' },
  it_equipment: { badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', bar: 'from-cyan-400 to-cyan-600' },
  land: { badge: 'bg-green-500/10 text-green-600 dark:text-green-400', bar: 'from-green-400 to-green-600' },
  intangible: { badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', bar: 'from-pink-400 to-pink-600' },
};

const STATUS_CONFIG: Record<string, { bg: string; dot: string; text: string }> = {
  active: { bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  disposed: { bg: 'bg-red-500/10', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  fully_depreciated: { bg: 'bg-slate-500/10', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400' },
};

function formatAmount(val: number): string {
  return new Intl.NumberFormat('en', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-6 dark:from-slate-800 dark:to-slate-700">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-300/60 dark:bg-slate-600/60" />
            <div className="mt-4 h-8 w-28 animate-pulse rounded-full bg-slate-300/60 dark:bg-slate-600/60" />
          </div>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        <div className="p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 animate-pulse rounded-full bg-slate-100/60 dark:bg-slate-700/40" style={{ width: `${120 + Math.random() * 150}px` }} />
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100/60 dark:bg-slate-700/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
        <svg className="h-8 w-8 text-slate-400 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const key = category.toLowerCase().replace(/[\s&]+/g, '_');
  const colors = CATEGORY_COLORS[key] || { badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', bar: 'from-slate-400 to-slate-500' };
  const icon = CATEGORY_ICONS[key] || '\uD83D\uDCE6';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', colors.badge)}>
      <span className="text-sm">{icon}</span>
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/[\s]+/g, '_');
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.active;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', config.bg, config.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
}

function DepreciationBar({ acquisitionCost, nbv }: { acquisitionCost: number; nbv: number }) {
  if (acquisitionCost <= 0) return null;
  const pct = Math.min(100, Math.max(0, (nbv / acquisitionCost) * 100));
  const depPct = 100 - pct;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
            pct > 50 ? 'from-emerald-400 to-emerald-500' : pct > 20 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[3rem] text-right text-[11px] font-mono font-semibold tabular-nums text-slate-500 dark:text-slate-400">
        {depPct.toFixed(0)}%
      </span>
    </div>
  );
}

export function AssetsPage() {
  const { t } = useTranslation();
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const { data: sites } = useSites();
  const { data: assetsData, isLoading: assetsLoading } = useAssets(selectedSiteId || '');
  const { data: summary, isLoading: summaryLoading } = useAssetSummary(selectedSiteId);

  const isLoading = assetsLoading || summaryLoading;

  const siteName = useMemo(() => {
    if (!selectedSiteId || !sites) return t('common.consolidated');
    return sites.find((s) => s.id === selectedSiteId)?.name ?? 'Unknown Site';
  }, [selectedSiteId, sites, t]);

  const items = assetsData?.items ?? [];

  const summaryDefs = [
    { label: t('assets.totalAssets'), value: summary?.total_assets ?? items.length, isCurrency: false, gradient: 'from-blue-500 to-indigo-600', icon: '\uD83D\uDCCA' },
    { label: t('assets.totalNBV'), value: summary?.total_nbv ?? 0, isCurrency: true, gradient: 'from-emerald-500 to-teal-600', icon: '\uD83D\uDCB0' },
    { label: t('assets.fullyDepreciated'), value: summary?.fully_depreciated ?? 0, isCurrency: false, gradient: 'from-amber-500 to-orange-600', icon: '\u26A0\uFE0F' },
    { label: t('assets.activeCount'), value: summary?.active_count ?? 0, isCurrency: false, gradient: 'from-teal-500 to-cyan-600', icon: '\u2705' },
  ];

  if (isLoading) return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">{t('assets.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>
      <LoadingSkeleton />
    </div>
  );

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
          {t('assets.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>

      {/* Summary Cards - gradient style */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {summaryDefs.map((card, i) => (
          <div
            key={i}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]',
              card.gradient
            )}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
          >
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150" />
            <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full bg-white/5" />
            <span className="text-2xl">{card.icon}</span>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-white/70">{card.label}</p>
            <p className="mt-1 text-2xl font-bold font-display tabular-nums">
              {card.isCurrency ? <span className="font-mono">{formatAmount(card.value)}</span> : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Assets Table */}
      {items.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">{t('assets.register')}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {items.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.code')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.name')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.category')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.acquisitionCost')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.nbv')}</th>
                  <th className="w-40 px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">Depreciation</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((asset: any, idx: number) => {
                  const acqCost = asset.acquisition_cost ?? 0;
                  const nbv = asset.net_book_value ?? asset.nbv ?? 0;
                  return (
                    <tr
                      key={asset.id || idx}
                      className="group border-b border-slate-50 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-transparent hover:scale-[1.002] dark:border-slate-800/50 dark:hover:from-slate-700/20 dark:hover:to-transparent opacity-0 animate-[fadeIn_0.35s_ease-out_forwards]"
                      style={{ animationDelay: `${idx * 35}ms`, animationFillMode: 'backwards' }}
                    >
                      <td className="px-6 py-3.5 text-sm font-mono font-medium text-slate-500 dark:text-slate-400">{asset.asset_code || asset.code}</td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{asset.name || asset.description}</td>
                      <td className="px-6 py-3.5"><CategoryBadge category={asset.category || '-'} /></td>
                      <td className="px-6 py-3.5 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(acqCost)}</td>
                      <td className="px-6 py-3.5 text-sm text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{formatAmount(nbv)}</td>
                      <td className="px-6 py-3.5"><DepreciationBar acquisitionCost={acqCost} nbv={nbv} /></td>
                      <td className="px-6 py-3.5"><StatusBadge status={asset.status || 'active'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
