import { useDashboardStore } from '@/store/dashboardStore';
import { useUploadHistory } from '@/api/hooks';
import { UploadForm } from '@/components/upload/UploadForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDateTime } from '@/utils/formatters';
import { useTranslation } from '@/i18n/useTranslation';

const STATUS_PILL: Record<string, string> = {
  validated: 'pill-green',
  approved: 'pill-green',
  pending: 'pill-amber',
  rejected: 'pill-red',
};

const STATEMENT_LABELS: Record<string, string> = {
  income_statement: 'Income Statement',
  balance_sheet: 'Balance Sheet',
  cash_flow: 'Cash Flow',
};

export function UploadPage() {
  const { t } = useTranslation();
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const { data: history, isLoading: historyLoading } = useUploadHistory(selectedSiteId || '');

  return (
    <div className="page-enter space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
          {t('upload.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('upload.subtitle')}
        </p>
      </div>

      {/* Upload form in glass-card */}
      <div className="glass-card p-6">
        <UploadForm />
      </div>

      {/* Upload history */}
      <div>
        <h2 className="text-lg font-semibold font-display text-slate-900 dark:text-white mb-4">
          {t('upload.history')}
        </h2>

        {historyLoading ? (
          <LoadingSpinner label="Loading history..." />
        ) : !history || history.items.length === 0 ? (
          <div className="glass-card border-dashed">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No uploads yet. Upload your first financial statement above.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Statement Type
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Uploaded By
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Uploaded At
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-700/30">
                {history.items.map((stmt) => (
                  <tr key={stmt.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {STATEMENT_LABELS[stmt.statementType] || stmt.statementType}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {stmt.period.label}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_PILL[stmt.status] || 'pill-slate'}>
                        <span className="dot" />
                        {stmt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {stmt.uploadedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {formatDateTime(stmt.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {stmt.lineItems.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
