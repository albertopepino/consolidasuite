import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSites, useAssets, useAssetSummary } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';

const CATEGORY_COLORS: Record<string, string> = {
  'buildings': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'machinery': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'vehicles': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'furniture': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'it_equipment': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  'land': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'intangible': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  disposed: 'bg-red-500/10 text-red-600 dark:text-red-400',
  fully_depreciated: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

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
          {Array.from({ length: 8 }).map((_, i) => (
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const key = category.toLowerCase().replace(/[\s&]+/g, '_');
  const color = CATEGORY_COLORS[key] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', color)}>
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/[\s]+/g, '_');
  const color = STATUS_COLORS[key] || STATUS_COLORS.active;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', key === 'active' ? 'bg-emerald-500' : key === 'disposed' ? 'bg-red-500' : 'bg-slate-400')} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
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

  const summaryCards = [
    { label: t('assets.totalAssets'), value: summary?.total_assets ?? items.length, isCurrency: false },
    { label: t('assets.totalNBV'), value: summary?.total_nbv ?? 0, isCurrency: true },
    { label: t('assets.fullyDepreciated'), value: summary?.fully_depreciated ?? 0, isCurrency: false },
    { label: t('assets.activeCount'), value: summary?.active_count ?? 0, isCurrency: false },
  ];

  if (isLoading) return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('assets.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>
      <LoadingSkeleton />
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('assets.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="glass-card p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {card.isCurrency ? formatAmount(card.value) : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Assets Table */}
      {items.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <div className="glass-card overflow-hidden animate-in">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('assets.register')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.code')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.name')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.category')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.acquisitionCost')}</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('assets.nbv')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((asset: any, idx: number) => (
                  <tr key={asset.id || idx} className="border-b border-slate-100/40 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20 transition-colors duration-150">
                    <td className="px-6 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">{asset.asset_code || asset.code}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{asset.name || asset.description}</td>
                    <td className="px-6 py-3"><CategoryBadge category={asset.category || '-'} /></td>
                    <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(asset.acquisition_cost ?? 0)}</td>
                    <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(asset.net_book_value ?? asset.nbv ?? 0)}</td>
                    <td className="px-6 py-3"><StatusBadge status={asset.status || 'active'} /></td>
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
