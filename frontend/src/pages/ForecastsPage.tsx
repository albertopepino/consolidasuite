import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useForecasts } from '@/api/hooks';
import { useSites } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/utils/cn';

const SOURCE_PILLS: Record<string, string> = {
  manual: 'pill-slate',
  trend: 'pill-blue',
  ai_predicted: 'pill-purple',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  trend: 'Trend',
  ai_predicted: 'AI',
};

function SourceBadge({ source }: { source: string }) {
  const s = source.toLowerCase();
  return (
    <span className={cn(SOURCE_PILLS[s] || 'pill-slate', 'text-[10px]')}>
      {SOURCE_LABELS[s] || source}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" style={{ width: `${100 + Math.random() * 150}px` }} />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ForecastsPage() {
  const { t } = useTranslation();
  const { data: sitesData } = useSites();
  const sites = sitesData ?? [];
  const { selectedSiteId, setSelectedSite } = useDashboardStore();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const siteId = selectedSiteId || (sites.length > 0 ? sites[0].id : '');
  const { data, isLoading } = useForecasts(siteId, year);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('forecasts.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('forecasts.subtitle')}
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={siteId}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <SourceBadge source="manual" />
          <span className="text-xs text-slate-500">{t('forecasts.manual')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SourceBadge source="trend" />
          <span className="text-xs text-slate-500">{t('forecasts.trend')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SourceBadge source="ai_predicted" />
          <span className="text-xs text-slate-500">{t('forecasts.aiPredicted')}</span>
        </div>
      </div>

      {/* Forecast Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState message={t('forecasts.noData')} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="sticky left-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 min-w-[180px]">
                  {t('forecasts.lineItem')}
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-3 py-3 text-right font-medium text-slate-500 dark:text-slate-400 min-w-[100px]">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-200 min-w-[110px] font-semibold">
                  {t('forecasts.total')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((row: any) => {
                const monthValues = row.months ?? {};
                const total = Object.values(monthValues).reduce((sum: number, v: any) => sum + (v?.value ?? 0), 0);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {row.line_item}
                    </td>
                    {MONTHS.map((_, idx) => {
                      const cell = monthValues[idx + 1];
                      const value = cell?.value;
                      const source = cell?.source;
                      return (
                        <td key={idx} className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{value != null ? Number(value).toLocaleString() : '-'}</span>
                            {source && <SourceBadge source={source} />}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {total > 0 ? Number(total).toLocaleString() : '-'}
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
