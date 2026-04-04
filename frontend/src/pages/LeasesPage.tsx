import { useTranslation } from '@/i18n/useTranslation';
import { useLeases, useSites } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/utils/cn';

const STANDARD_PILLS: Record<string, string> = {
  ifrs16: 'pill-blue',
  asc842: 'pill-purple',
};

function StandardBadge({ standard }: { standard: string }) {
  const s = standard.toLowerCase();
  return (
    <span className={cn(STANDARD_PILLS[s] || 'pill-slate', 'text-[10px] font-semibold')}>
      {standard.toUpperCase()}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function LeasesPage() {
  const { t } = useTranslation();
  const { data: sitesData } = useSites();
  const sites = sitesData ?? [];
  const { selectedSiteId, setSelectedSite } = useDashboardStore();

  const siteId = selectedSiteId || (sites.length > 0 ? sites[0].id : '');
  const { data, isLoading } = useLeases(siteId);

  const items = data?.items ?? [];

  // Summary calculations
  const totalRouAsset = items.reduce((sum: number, l: any) => sum + (l.rou_asset ?? 0), 0);
  const totalLeaseLiability = items.reduce((sum: number, l: any) => sum + (l.lease_liability ?? 0), 0);
  const activeCount = items.filter((l: any) => l.status?.toLowerCase() === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('leases.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('leases.subtitle')}
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
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('leases.activeLeases')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('leases.totalRouAsset')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalRouAsset.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('leases.totalLiability')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalLeaseLiability.toLocaleString()}</p>
        </div>
      </div>

      {/* Lease Register Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState message={t('leases.noLeases')} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('leases.leaseName')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('leases.assetType')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('leases.standard')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('leases.startDate')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('leases.endDate')}</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('leases.monthlyPayment')}</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('leases.rouAsset')}</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('leases.liability')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((lease: any) => (
                <tr key={lease.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{lease.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lease.asset_type}</td>
                  <td className="px-4 py-3">
                    <StandardBadge standard={lease.accounting_standard ?? 'IFRS16'} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lease.start_date ? new Date(lease.start_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lease.end_date ? new Date(lease.end_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {lease.monthly_payment != null ? Number(lease.monthly_payment).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {lease.rou_asset != null ? Number(lease.rou_asset).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {lease.lease_liability != null ? Number(lease.lease_liability).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'pill-green',
                      lease.status?.toLowerCase() === 'expired' && 'pill-slate',
                      lease.status?.toLowerCase() === 'terminated' && 'pill-red'
                    )}>
                      {lease.status ?? 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
