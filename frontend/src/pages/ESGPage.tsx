import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useESGMetrics, useSites } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/utils/cn';

type ESGTab = 'environmental' | 'social' | 'governance';

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40 mb-3" />
          <div className="h-8 w-28 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40 mb-2" />
          <div className="h-2 w-full animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/10">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function MetricCard({ metric }: { metric: any }) {
  const { t } = useTranslation();
  const value = metric.value ?? 0;
  const target = metric.target ?? 0;
  const progress = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const onTrack = target > 0 && value >= target;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{metric.name}</p>
        {metric.category && (
          <span className={cn(
            'text-[10px] font-semibold rounded-full px-2 py-0.5',
            metric.category === 'environmental' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            metric.category === 'social' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          )}>
            {metric.category.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {metric.unit && (
          <span className="text-sm text-slate-500 dark:text-slate-400">{metric.unit}</span>
        )}
      </div>

      {target > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500 dark:text-slate-400">
              {t('esg.target')}: {target.toLocaleString()} {metric.unit ?? ''}
            </span>
            <span className={cn(
              'font-medium',
              onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            )}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                onTrack ? 'bg-emerald-500' : progress > 60 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ESGPage() {
  const { t } = useTranslation();
  const { data: sitesData } = useSites();
  const sites = sitesData ?? [];
  const { selectedSiteId, setSelectedSite } = useDashboardStore();
  const [tab, setTab] = useState<ESGTab>('environmental');

  const siteId = selectedSiteId || (sites.length > 0 ? sites[0].id : '');
  const { data, isLoading } = useESGMetrics(siteId);

  const allMetrics = data?.items ?? [];
  const filteredMetrics = allMetrics.filter((m: any) => m.category?.toLowerCase() === tab);

  const tabs: { key: ESGTab; label: string }[] = [
    { key: 'environmental', label: t('esg.environmentalTab') },
    { key: 'social', label: t('esg.socialTab') },
    { key: 'governance', label: t('esg.governanceTab') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('esg.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('esg.subtitle')}
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

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                'whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors',
                tab === tb.key
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              )}
            >
              {tb.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredMetrics.length === 0 ? (
        <EmptyState message={t('esg.noMetrics')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMetrics.map((metric: any) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}
    </div>
  );
}
