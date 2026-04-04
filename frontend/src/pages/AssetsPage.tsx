import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSites, useAssets, useAssetSummary } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import { ExportButton } from '@/components/ui/ExportButton';

const CATEGORY_PILLS: Record<string, string> = {
  buildings: 'pill-blue',
  machinery: 'pill-violet',
  vehicles: 'pill-amber',
  furniture: 'pill-slate',
  it_equipment: 'pill-blue',
  land: 'pill-green',
  intangible: 'pill-violet',
};

const STATUS_PILLS: Record<string, { pill: string; dot: string }> = {
  active: { pill: 'pill-green', dot: 'bg-emerald-500' },
  disposed: { pill: 'pill-red', dot: 'bg-red-500' },
  fully_depreciated: { pill: 'pill-slate', dot: 'bg-slate-400' },
};

function formatAmount(val: number): string {
  return new Intl.NumberFormat('en', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-700" style={{ width: `${120 + Math.random() * 150}px` }} />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
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
  const pill = CATEGORY_PILLS[key] || 'pill-slate';
  return <span className={pill}>{category}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/[\s]+/g, '_');
  const config = STATUS_PILLS[key] || STATUS_PILLS.active;
  return (
    <span className={cn(config.pill, 'inline-flex items-center gap-1.5')}>
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
            'h-full rounded-full transition-all duration-500',
            pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
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

const BORDER_COLORS = ['border-l-blue-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-teal-500'];

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
    { label: t('assets.totalAssets'), value: summary?.total_assets ?? items.length, isCurrency: false },
    { label: t('assets.totalNBV'), value: summary?.total_nbv ?? 0, isCurrency: true },
    { label: t('assets.fullyDepreciated'), value: summary?.fully_depreciated ?? 0, isCurrency: false },
    { label: t('assets.activeCount'), value: summary?.active_count ?? 0, isCurrency: false },
  ];

  if (isLoading) return (
    <div className="page-enter space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('assets.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
      </div>
      <LoadingSkeleton />
    </div>
  );

  return (
    <div className="page-enter space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('assets.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{siteName}</p>
        </div>
        {selectedSiteId && (
          <ExportButton
            endpoint={`/export/assets/${selectedSiteId}`}
            filename={`assets_${selectedSiteId}`}
          />
        )}
      </div>

      {/* Summary Cards - white with colored left border */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {summaryDefs.map((card, i) => (
          <div
            key={i}
            className={cn('card border-l-4 p-5', BORDER_COLORS[i])}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {card.isCurrency ? formatAmount(card.value) : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Assets Table */}
      {items.length === 0 ? (
        <EmptyState message={t('common.noData')} />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('assets.register')}</h2>
            <span className="pill-slate">{items.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assets.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assets.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assets.category')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assets.acquisitionCost')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assets.nbv')}</th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Depreciation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((asset: any, idx: number) => {
                  const acqCost = asset.acquisition_cost ?? 0;
                  const nbv = asset.net_book_value ?? asset.nbv ?? 0;
                  return (
                    <tr
                      key={asset.id || idx}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-700/20"
                    >
                      <td className="px-6 py-3 text-sm font-mono font-medium text-slate-500 dark:text-slate-400">{asset.asset_code || asset.code}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{asset.name || asset.description}</td>
                      <td className="px-6 py-3"><CategoryBadge category={asset.category || '-'} /></td>
                      <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(acqCost)}</td>
                      <td className="px-6 py-3 text-sm text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{formatAmount(nbv)}</td>
                      <td className="px-6 py-3"><DepreciationBar acquisitionCost={acqCost} nbv={nbv} /></td>
                      <td className="px-6 py-3"><StatusBadge status={asset.status || 'active'} /></td>
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
