import { useState } from 'react';
import { useLegalEntities, useStatutoryAudits } from '@/api/hooks';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import { useDashboardStore } from '@/store/dashboardStore';

type LegalTab = 'entities' | 'directors' | 'audits';

const ENTITY_TYPE_PILLS: Record<string, string> = {
  holding: 'pill-violet',
  operating: 'pill-blue',
  dormant: 'pill-slate',
  spv: 'pill-amber',
  branch: 'pill-blue',
};

const AUDIT_STATUS_PILLS: Record<string, string> = {
  not_started: 'pill-slate',
  in_progress: 'pill-blue',
  draft_report: 'pill-amber',
  final_report: 'pill-green',
  filed: 'pill-green',
  completed: 'pill-green',
  scheduled: 'pill-amber',
  overdue: 'pill-red',
  pending: 'pill-slate',
};

const AUDIT_DOT_COLORS: Record<string, string> = {
  not_started: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  draft_report: 'bg-amber-500',
  final_report: 'bg-emerald-500',
  filed: 'bg-emerald-500',
  completed: 'bg-emerald-500',
  scheduled: 'bg-amber-500',
  overdue: 'bg-red-500',
  pending: 'bg-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/[\s]+/g, '_');
  const pill = AUDIT_STATUS_PILLS[s] || 'pill-slate';
  const dot = AUDIT_DOT_COLORS[s] || 'bg-slate-400';
  return (
    <span className={cn(pill, 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/[\s]+/g, '_');
  const pill = ENTITY_TYPE_PILLS[key] || 'pill-slate';
  return <span className={pill}>{type}</span>;
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
    <div className="space-y-4 stagger-children">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e: any, idx: number) => (
          <div key={e.id || idx} className="glass-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{e.name || e.entity_name}</h3>
                  <p className="mt-0.5 text-xs font-mono text-slate-400 dark:text-slate-500">{e.registration_number || e.reg_number || '-'}</p>
                </div>
                <TypeBadge type={e.entity_type || e.type || '-'} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.jurisdiction')}</p>
                  <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{e.jurisdiction || e.country || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('legal.ownership')}</p>
                  <p className="mt-0.5 text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300">{e.ownership_pct != null ? `${e.ownership_pct}%` : '-'}</p>
                </div>
              </div>

              <div className="mt-4">
                <StatusBadge status={e.status || 'active'} />
              </div>
            </div>
          </div>
        ))}
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

  const entitiesWithDirectors = entities.filter((e: any) => e.directors && e.directors.length > 0);
  if (entitiesWithDirectors.length === 0) return <EmptyState message={t('common.noData')} />;

  return (
    <div className="space-y-4 stagger-children">
      {entitiesWithDirectors.map((entity: any, idx: number) => (
        <div key={entity.id || idx} className="glass-card overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">{entity.name || entity.entity_name}</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entity.jurisdiction || entity.country}</p>
            </div>
            <span className="pill-slate">{entity.directors.length}</span>
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
                  <tr key={dIdx} className="border-b border-slate-100/40 transition-colors duration-150 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20">
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{d.name || d.full_name}</td>
                    <td className="px-6 py-3"><span className="pill-blue">{d.role || d.position || '-'}</span></td>
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
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">{t('legal.audits')}</h2>
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
              <tr key={a.id || idx} className="border-b border-slate-100/40 transition-colors duration-150 hover:bg-blue-50/30 dark:border-slate-700/20 dark:hover:bg-slate-700/20">
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
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
          {t('legal.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('legal.subtitle')}
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

      {activeTab === 'entities' && <EntitiesTab />}
      {activeTab === 'directors' && <DirectorsTab />}
      {activeTab === 'audits' && <AuditsTab />}
    </div>
  );
}
