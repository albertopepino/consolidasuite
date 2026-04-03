import { useState } from 'react';
import { useLegalEntities, useStatutoryAudits } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import { useDashboardStore } from '@/store/dashboardStore';

type LegalTab = 'entities' | 'directors' | 'audits';

const ENTITY_TYPE_COLORS: Record<string, string> = {
  'holding': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'operating': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'dormant': 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  'spv': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'branch': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
};

const AUDIT_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  scheduled: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
  pending: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

const AUDIT_DOT_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500',
  in_progress: 'bg-blue-500',
  scheduled: 'bg-amber-500',
  overdue: 'bg-red-500',
  pending: 'bg-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/[\s]+/g, '_');
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', AUDIT_STATUS_COLORS[s] || AUDIT_STATUS_COLORS.pending)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', AUDIT_DOT_COLORS[s] || AUDIT_DOT_COLORS.pending)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/[\s]+/g, '_');
  const color = ENTITY_TYPE_COLORS[key] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', color)}>
      {type}
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function EntitiesTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useLegalEntities();

  if (isLoading) return <LoadingSkeleton />;
  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="glass-card overflow-hidden animate-in">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('legal.entities')}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.entityName')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.registration')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.entityType')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.jurisdiction')}</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.ownership')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e: any, idx: number) => (
              <tr key={e.id || idx} className="border-b border-slate-100/40 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20 transition-colors duration-150">
                <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{e.name || e.entity_name}</td>
                <td className="px-6 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">{e.registration_number || e.reg_number || '-'}</td>
                <td className="px-6 py-3"><TypeBadge type={e.entity_type || e.type || '-'} /></td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{e.jurisdiction || e.country || '-'}</td>
                <td className="px-6 py-3 text-sm text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{e.ownership_pct != null ? `${e.ownership_pct}%` : '-'}</td>
                <td className="px-6 py-3"><StatusBadge status={e.status || 'active'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DirectorsTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useLegalEntities();

  if (isLoading) return <LoadingSkeleton />;
  const entities = data?.items ?? [];
  if (entities.length === 0) return <EmptyState message={t('common.noData')} />;

  // Group directors by entity
  const entitiesWithDirectors = entities.filter((e: any) => e.directors && e.directors.length > 0);
  if (entitiesWithDirectors.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="space-y-4 animate-in">
      {entitiesWithDirectors.map((entity: any, idx: number) => (
        <div key={entity.id || idx} className="glass-card overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{entity.name || entity.entity_name}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entity.jurisdiction || entity.country}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.directorName')}</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.role')}</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.appointedDate')}</th>
                </tr>
              </thead>
              <tbody>
                {entity.directors.map((d: any, dIdx: number) => (
                  <tr key={dIdx} className="border-b border-slate-100/40 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20 transition-colors duration-150">
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{d.name || d.full_name}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{d.role || d.position || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{d.appointed_date || d.start_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditsTab() {
  const { t } = useTranslation();
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const { data, isLoading } = useStatutoryAudits(selectedYear);

  if (isLoading) return <LoadingSkeleton />;
  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="glass-card overflow-hidden animate-in">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('legal.audits')}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{selectedYear}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.entityName')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.auditor')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.auditType')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('tax.dueDate')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a: any, idx: number) => (
              <tr key={a.id || idx} className="border-b border-slate-100/40 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20 transition-colors duration-150">
                <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{a.entity_name || a.name}</td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{a.auditor || a.audit_firm || '-'}</td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{a.audit_type || a.type || '-'}</td>
                <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{a.due_date || a.deadline || '-'}</td>
                <td className="px-6 py-3"><StatusBadge status={a.status || 'pending'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LegalPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LegalTab>('entities');

  const TAB_DEFS: { key: LegalTab; labelKey: string; icon: string }[] = [
    { key: 'entities', labelKey: 'legal.entitiesTab', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { key: 'directors', labelKey: 'legal.directorsTab', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'audits', labelKey: 'legal.auditsTab', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('legal.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('legal.subtitle')}
        </p>
      </div>

      <div className="flex gap-2">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'glass-card !rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
            </svg>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'entities' && <EntitiesTab />}
      {activeTab === 'directors' && <DirectorsTab />}
      {activeTab === 'audits' && <AuditsTab />}
    </div>
  );
}
