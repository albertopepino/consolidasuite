import { useTranslation } from '@/i18n/useTranslation';
import { useAllocationRules, useExecuteAllocation } from '@/api/hooks';
import { cn } from '@/utils/cn';

const METHOD_PILLS: Record<string, string> = {
  percentage: 'pill-blue',
  headcount: 'pill-amber',
  revenue: 'pill-green',
  equal: 'pill-slate',
  custom: 'pill-purple',
};

function MethodBadge({ method }: { method: string }) {
  const s = method.toLowerCase();
  return (
    <span className={cn(METHOD_PILLS[s] || 'pill-slate', 'text-[10px]')}>
      {method.charAt(0).toUpperCase() + method.slice(1)}
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function AllocationFlow({ source, targets }: { source: string; targets: { name: string; percentage: number }[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
        {source}
      </span>
      <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      <div className="flex flex-wrap gap-1.5">
        {targets.map((tgt, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300">
            {tgt.name}
            <span className="text-[10px] text-slate-500">({tgt.percentage}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AllocationsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAllocationRules();
  const executeMutation = useExecuteAllocation();

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('allocations.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('allocations.subtitle')}
        </p>
      </div>

      {/* Allocation Rules Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState message={t('allocations.noRules')} />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('allocations.ruleName')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('allocations.method')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('allocations.flow')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('allocations.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((rule: any) => (
                <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{rule.name}</p>
                      {rule.description && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{rule.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <MethodBadge method={rule.method ?? 'percentage'} />
                  </td>
                  <td className="px-4 py-3">
                    <AllocationFlow
                      source={rule.source_entity ?? rule.source ?? 'Source'}
                      targets={rule.targets ?? [{ name: 'Target', percentage: 100 }]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      rule.is_active ? 'pill-green' : 'pill-slate'
                    )}>
                      {rule.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => executeMutation.mutate(rule.id)}
                      disabled={executeMutation.isPending || !rule.is_active}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        rule.is_active
                          ? 'bg-brand-500 text-white hover:bg-brand-600'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                      )}
                    >
                      {t('allocations.execute')}
                    </button>
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
