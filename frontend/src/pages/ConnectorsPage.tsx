import { useTranslation } from '@/i18n/useTranslation';
import { useConnectors, useSyncConnector } from '@/api/hooks';
import { cn } from '@/utils/cn';

const ERP_ICONS: Record<string, string> = {
  sap: 'SAP',
  oracle: 'ORC',
  netsuite: 'NS',
  workday: 'WD',
  dynamics: 'D365',
  sage: 'SGE',
  xero: 'XRO',
  quickbooks: 'QB',
  csv: 'CSV',
  api: 'API',
};

const ERP_COLORS: Record<string, string> = {
  sap: 'bg-blue-500',
  oracle: 'bg-red-500',
  netsuite: 'bg-orange-500',
  workday: 'bg-indigo-500',
  dynamics: 'bg-teal-500',
  sage: 'bg-green-500',
  xero: 'bg-sky-500',
  quickbooks: 'bg-emerald-500',
  csv: 'bg-slate-500',
  api: 'bg-purple-500',
};

const SYNC_STATUS_PILLS: Record<string, string> = {
  connected: 'pill-green',
  syncing: 'pill-blue',
  error: 'pill-red',
  disconnected: 'pill-slate',
  pending: 'pill-amber',
};

function SyncStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span className={cn(SYNC_STATUS_PILLS[s] || 'pill-slate', 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full',
        s === 'connected' ? 'bg-emerald-500' :
        s === 'syncing' ? 'bg-blue-500 animate-pulse' :
        s === 'error' ? 'bg-red-500' :
        s === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
      )} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100/60 dark:bg-slate-700/40" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
          </div>
          <div className="h-3 w-32 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function ConnectorsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useConnectors();
  const syncMutation = useSyncConnector();

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('connectors.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('connectors.subtitle')}
        </p>
      </div>

      {/* Supported ERPs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ERP_ICONS).map(([key, label]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <span className={cn('h-2 w-2 rounded-full', ERP_COLORS[key])} />
            {label}
          </span>
        ))}
      </div>

      {/* Connector Cards */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState message={t('connectors.noConnectors')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((conn: any) => {
            const erpKey = (conn.erp_type ?? '').toLowerCase();
            return (
              <div key={conn.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white text-xs font-bold', ERP_COLORS[erpKey] || 'bg-slate-500')}>
                      {ERP_ICONS[erpKey] || erpKey.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{conn.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{conn.erp_type}</p>
                    </div>
                  </div>
                  <SyncStatusBadge status={conn.status ?? 'disconnected'} />
                </div>

                <div className="mt-4 space-y-2">
                  {conn.last_sync_at && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('connectors.lastSync')}: {new Date(conn.last_sync_at).toLocaleString()}
                    </p>
                  )}
                  {conn.records_synced != null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('connectors.recordsSynced')}: {Number(conn.records_synced).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => syncMutation.mutate(conn.id)}
                    disabled={syncMutation.isPending || conn.status === 'syncing'}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      conn.status === 'syncing'
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-brand-500 text-white hover:bg-brand-600'
                    )}
                  >
                    {conn.status === 'syncing' ? t('connectors.syncing') : t('connectors.sync')}
                  </button>
                  <button className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {t('connectors.configure')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
