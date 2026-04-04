import { useState, useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSites, useICInvoices, useICReconciliation, useICLoans } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import { ExportButton } from '@/components/ui/ExportButton';

type ICTab = 'invoices' | 'reconciliation' | 'loans';

const STATUS_PILLS: Record<string, string> = {
  pending: 'pill-amber',
  approved: 'pill-green',
  rejected: 'pill-red',
  matched: 'pill-green',
  unmatched: 'pill-red',
  partial: 'pill-amber',
  active: 'pill-blue',
  matured: 'pill-slate',
};

const DOT_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  matched: 'bg-emerald-500',
  unmatched: 'bg-red-500',
  partial: 'bg-amber-500',
  active: 'bg-blue-500',
  matured: 'bg-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const pill = STATUS_PILLS[s] || 'pill-slate';
  const dot = DOT_COLORS[s] || 'bg-slate-400';
  return (
    <span className={cn(pill, 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function formatAmount(val: number): string {
  return new Intl.NumberFormat('en', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}


function InvoicesTab({ siteId }: { siteId: string | null }) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = useICInvoices(siteId || undefined, statusFilter || undefined);

  if (isLoading) return <LoadingSkeleton />;
  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('ic.invoices')}</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input max-w-[180px]"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="pending">{t('ic.pending')}</option>
          <option value="approved">{t('ic.approved')}</option>
          <option value="rejected">{t('ic.rejected')}</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.sender')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.receiver')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.amount')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.currency')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.date')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((inv: any, idx: number) => (
              <tr key={inv.id || idx} className="border-b border-slate-100/40 transition-colors duration-150 hover:bg-slate-50 dark:border-slate-700/20 dark:hover:bg-slate-700/20">
                <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{inv.sender_name || inv.sender_site_id}</td>
                <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{inv.receiver_name || inv.receiver_site_id}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(inv.amount)}</td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{inv.currency || 'EUR'}</td>
                <td className="px-6 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{inv.invoice_date || inv.date || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReconciliationTab({ year, month }: { year: number; month: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useICReconciliation(year, month);

  if (isLoading) return <LoadingSkeleton />;
  const pairs = data?.pairs ?? data?.items ?? [];
  if (pairs.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('ic.reconciliation')}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{year}-{String(month).padStart(2, '0')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.sender')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.receiver')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.senderAmount')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.receiverAmount')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.difference')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair: any, idx: number) => {
              const diff = (pair.sender_amount ?? 0) - (pair.receiver_amount ?? 0);
              const isMatched = Math.abs(diff) < 0.01;
              const status = pair.status || (isMatched ? 'matched' : 'unmatched');
              return (
                <tr
                  key={pair.id || idx}
                  className={cn(
                    'border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-700/20 dark:hover:bg-slate-700/20'
                  )}
                >
                  <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{pair.sender_name || pair.sender_site_id}</td>
                  <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{pair.receiver_name || pair.receiver_site_id}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(pair.sender_amount ?? 0)}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(pair.receiver_amount ?? 0)}</td>
                  <td className={cn('px-6 py-3 text-sm text-right font-mono tabular-nums', Math.abs(diff) > 0.01 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400')}>
                    {formatAmount(diff)}
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoansTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useICLoans();

  if (isLoading) return <LoadingSkeleton />;
  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('ic.loans')}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.lender')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.borrower')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.amount')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.rate')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('ic.maturity')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((loan: any, idx: number) => (
              <tr key={loan.id || idx} className="border-b border-slate-100/40 transition-colors duration-150 hover:bg-slate-50 dark:border-slate-700/20 dark:hover:bg-slate-700/20">
                <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{loan.lender_name || loan.lender_site_id}</td>
                <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">{loan.borrower_name || loan.borrower_site_id}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatAmount(loan.principal_amount ?? loan.amount ?? 0)}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{loan.interest_rate != null ? `${loan.interest_rate}%` : '-'}</td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{loan.maturity_date || '-'}</td>
                <td className="px-6 py-3"><StatusBadge status={loan.status || 'active'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function IntercompanyPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ICTab>('invoices');
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const { data: sites } = useSites();

  const siteName = useMemo(() => {
    if (!selectedSiteId || !sites) return t('common.allSites');
    return sites.find((s) => s.id === selectedSiteId)?.name ?? 'Unknown Site';
  }, [selectedSiteId, sites, t]);

  const TAB_DEFS: { key: ICTab; labelKey: string; icon: string }[] = [
    { key: 'invoices', labelKey: 'ic.invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { key: 'reconciliation', labelKey: 'ic.reconciliation', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { key: 'loans', labelKey: 'ic.loans', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  ];

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('ic.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {siteName}
          </p>
        </div>
        <ExportButton
          endpoint="/export/ic-invoices"
          filename="ic_invoices"
          params={selectedSiteId ? { site_id: selectedSiteId } : {}}
        />
      </div>

      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn('pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && <InvoicesTab siteId={selectedSiteId} />}
      {activeTab === 'reconciliation' && <ReconciliationTab year={selectedYear} month={selectedMonth} />}
      {activeTab === 'loans' && <LoansTab />}
    </div>
  );
}
