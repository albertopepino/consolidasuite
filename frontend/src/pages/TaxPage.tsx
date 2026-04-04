import { useState } from 'react';
import { useTaxJurisdictions, useTaxFilings, useTaxFilingOverview } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import { useDashboardStore } from '@/store/dashboardStore';

type TaxTab = 'rates' | 'filings';

const FILING_STATUS_PILLS: Record<string, string> = {
  pending: 'pill-amber',
  filed: 'pill-green',
  overdue: 'pill-red',
  draft: 'pill-slate',
};

const FILING_DOT_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  filed: 'bg-emerald-500',
  overdue: 'bg-red-500',
  draft: 'bg-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const pill = FILING_STATUS_PILLS[s] || 'pill-slate';
  const dot = FILING_DOT_COLORS[s] || 'bg-slate-400';
  return (
    <span className={cn(pill, 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot, s === 'overdue' && 'animate-pulse-soft')} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
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
    <div className="glass-card p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/10">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function formatPercent(val: number | string | null | undefined): string {
  if (val == null) return '-';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '-';
  // If value is already in percentage form (e.g. 25 instead of 0.25), format directly
  if (n > 1) return `${n.toFixed(1)}%`;
  return `${(n * 100).toFixed(1)}%`;
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function TaxRatesTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useTaxJurisdictions();

  if (isLoading) return <LoadingSkeleton />;
  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">{t('tax.jurisdictions')}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.jurisdiction')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.site')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.corporateTax')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.vat')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.socialSecurity')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((j: any, idx: number) => (
              <tr key={j.id || idx} className="border-b border-slate-100/40 transition-colors duration-150 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20">
                <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{j.jurisdiction || j.country}</td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{j.site_name || j.site_id || '-'}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatPercent(j.corporate_tax_rate)}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatPercent(j.vat_rate)}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatPercent(j.social_security_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilingsTab() {
  const { t } = useTranslation();
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = useTaxFilings(selectedYear, statusFilter || undefined);
  const { data: overview } = useTaxFilingOverview();

  if (isLoading) return <LoadingSkeleton />;
  const items = data?.items ?? [];

  return (
    <div className="space-y-4 stagger-children">
      {/* Overview cards */}
      {overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('tax.totalFilings'), value: overview.total ?? 0 },
            { label: t('tax.filed'), value: overview.filed ?? 0 },
            { label: t('tax.pending'), value: overview.pending ?? 0 },
            { label: t('tax.overdue'), value: overview.overdue ?? 0, isAlert: (overview.overdue ?? 0) > 0 },
          ].map((card, i) => (
            <div key={i} className="glass-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className={cn('mt-2 text-2xl font-bold font-display font-mono tabular-nums', card.isAlert ? 'text-red-500' : 'text-slate-900 dark:text-white')}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filings table */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">{t('tax.filings')}</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input max-w-[180px]"
          >
            <option value="">{t('common.allStatuses')}</option>
            <option value="filed">{t('tax.filed')}</option>
            <option value="pending">{t('tax.pending')}</option>
            <option value="overdue">{t('tax.overdue')}</option>
          </select>
        </div>
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.filingType')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.jurisdiction')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.site')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.dueDate')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f: any, idx: number) => {
                  const overdue = f.status?.toLowerCase() !== 'filed' && isOverdue(f.due_date);
                  const displayStatus = overdue ? 'overdue' : f.status;
                  return (
                    <tr key={f.id || idx} className="border-b border-slate-100/40 transition-colors duration-150 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20">
                      <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{f.filing_type || f.type || '-'}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{f.jurisdiction || f.country || '-'}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{f.site_name || f.site_id || '-'}</td>
                      <td className={cn('px-6 py-3 text-sm', overdue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
                        {f.due_date || '-'}
                      </td>
                      <td className="px-6 py-3"><StatusBadge status={displayStatus || 'pending'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaxPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TaxTab>('rates');

  const TAB_DEFS: { key: TaxTab; labelKey: string; icon: string }[] = [
    { key: 'rates', labelKey: 'tax.ratesTab', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
    { key: 'filings', labelKey: 'tax.filingsTab', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ];

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
          {t('tax.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('tax.subtitle')}
        </p>
      </div>

      <div className="segmented-control">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200',
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
            </svg>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'rates' && <TaxRatesTab />}
      {activeTab === 'filings' && <FilingsTab />}
    </div>
  );
}
