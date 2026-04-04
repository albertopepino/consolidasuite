import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useScenarios } from '@/api/hooks';
import { cn } from '@/utils/cn';

const STATUS_PILLS: Record<string, string> = {
  draft: 'pill-slate',
  active: 'pill-green',
  archived: 'pill-amber',
};

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span className={cn(STATUS_PILLS[s] || 'pill-slate', 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s === 'active' ? 'bg-emerald-500' : s === 'archived' ? 'bg-amber-500' : 'bg-slate-400')} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" style={{ width: `${140 + Math.random() * 120}px` }} />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100/60 dark:bg-slate-700/40" />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function ScenariosPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useScenarios();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const items = data?.items ?? [];

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('scenarios.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('scenarios.subtitle')}
          </p>
        </div>
        {compareIds.length === 2 && (
          <button
            onClick={() => setShowCompare(true)}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            {t('scenarios.compare')}
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState message={t('scenarios.noScenarios')} />
      ) : (
        <>
          {/* Scenario List */}
          <div className="card overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('scenarios.name')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('scenarios.description')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('scenarios.baseYear')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('scenarios.createdAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((sc: any) => (
                  <tr key={sc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(sc.id)}
                        onChange={() => toggleCompare(sc.id)}
                        disabled={!compareIds.includes(sc.id) && compareIds.length >= 2}
                        className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{sc.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{sc.description}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{sc.base_year}</td>
                    <td className="px-4 py-3"><StatusPill status={sc.status} /></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{sc.created_at ? new Date(sc.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compare View */}
          {showCompare && compareIds.length === 2 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('scenarios.comparison')}</h2>
                <button
                  onClick={() => { setShowCompare(false); setCompareIds([]); }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  {t('common.cancel')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {compareIds.map((id) => {
                  const scenario = items.find((s: any) => s.id === id);
                  return (
                    <div key={id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{scenario?.name}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{scenario?.description}</p>
                      <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 italic">
                        {t('scenarios.comparisonPlaceholder')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
