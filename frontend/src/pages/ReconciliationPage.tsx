import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useReconciliationItems, useSites } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/utils/cn';

const MATCH_STATUS_PILLS: Record<string, string> = {
  matched: 'pill-green',
  unmatched: 'pill-red',
  partial: 'pill-amber',
  excluded: 'pill-slate',
};

const MATCH_DOTS: Record<string, string> = {
  matched: 'bg-emerald-500',
  unmatched: 'bg-red-500',
  partial: 'bg-amber-500',
  excluded: 'bg-slate-400',
};

function MatchBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span className={cn(MATCH_STATUS_PILLS[s] || 'pill-slate', 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', MATCH_DOTS[s] || 'bg-slate-400')} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/10">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function ReconciliationPage() {
  const { t } = useTranslation();
  const { data: sitesData } = useSites();
  const sites = sitesData ?? [];
  const { selectedSiteId, setSelectedSite } = useDashboardStore();
  const [filterStatus, setFilterStatus] = useState<string>('');

  const siteId = selectedSiteId || (sites.length > 0 ? sites[0].id : '');
  const { data, isLoading } = useReconciliationItems(siteId);

  const allItems = data?.items ?? [];
  const items = filterStatus
    ? allItems.filter((item: any) => item.match_status?.toLowerCase() === filterStatus)
    : allItems;

  const matchedCount = allItems.filter((i: any) => i.match_status?.toLowerCase() === 'matched').length;
  const unmatchedCount = allItems.filter((i: any) => i.match_status?.toLowerCase() === 'unmatched').length;
  const partialCount = allItems.filter((i: any) => i.match_status?.toLowerCase() === 'partial').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('reconciliation.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('reconciliation.subtitle')}
          </p>
        </div>
        <select
          value={siteId}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {sites.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4 cursor-pointer hover:ring-2 hover:ring-emerald-500/30" onClick={() => setFilterStatus(filterStatus === 'matched' ? '' : 'matched')}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.matched')}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{matchedCount}</p>
        </div>
        <div className="card p-4 cursor-pointer hover:ring-2 hover:ring-red-500/30" onClick={() => setFilterStatus(filterStatus === 'unmatched' ? '' : 'unmatched')}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.unmatched')}</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{unmatchedCount}</p>
        </div>
        <div className="card p-4 cursor-pointer hover:ring-2 hover:ring-amber-500/30" onClick={() => setFilterStatus(filterStatus === 'partial' ? '' : 'partial')}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.partial')}</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{partialCount}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState message={t('reconciliation.noItems')} />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.account')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.description')}</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.sourceAmount')}</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.targetAmount')}</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('reconciliation.difference')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item: any) => {
                const isUnmatched = item.match_status?.toLowerCase() === 'unmatched';
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
                      isUnmatched && 'bg-red-50/30 dark:bg-red-950/10'
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.account_code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{item.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {item.source_amount != null ? Number(item.source_amount).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {item.target_amount != null ? Number(item.target_amount).toLocaleString() : '-'}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right tabular-nums font-medium',
                      item.difference > 0 ? 'text-red-600 dark:text-red-400' :
                      item.difference < 0 ? 'text-red-600 dark:text-red-400' :
                      'text-slate-600 dark:text-slate-300'
                    )}>
                      {item.difference != null ? Number(item.difference).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <MatchBadge status={item.match_status ?? 'unmatched'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
