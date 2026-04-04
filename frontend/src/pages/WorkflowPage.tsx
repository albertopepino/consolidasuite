import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useWorkflowInstances, useMyTasks } from '@/api/hooks';
import { cn } from '@/utils/cn';

type WorkflowTab = 'active' | 'tasks' | 'templates';

const STATUS_PILLS: Record<string, string> = {
  running: 'pill-blue',
  completed: 'pill-green',
  failed: 'pill-red',
  pending: 'pill-amber',
  paused: 'pill-slate',
};

const STATUS_DOTS: Record<string, string> = {
  running: 'bg-blue-500',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  pending: 'bg-amber-500',
  paused: 'bg-slate-400',
};

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span className={cn(STATUS_PILLS[s] || 'pill-slate', 'inline-flex items-center gap-1.5')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOTS[s] || 'bg-slate-400')} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

// Placeholder data for templates
const MOCK_TEMPLATES = [
  { id: '1', name: 'Monthly Close', description: 'Standard monthly close workflow with approvals', steps: 8 },
  { id: '2', name: 'Budget Approval', description: 'Multi-level budget review and sign-off', steps: 5 },
  { id: '3', name: 'Intercompany Recon', description: 'Intercompany reconciliation and matching', steps: 6 },
  { id: '4', name: 'Audit Preparation', description: 'Year-end audit preparation checklist', steps: 12 },
];

export function WorkflowPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<WorkflowTab>('active');

  const tabs: { key: WorkflowTab; label: string }[] = [
    { key: 'active', label: t('workflow.activeTab') },
    { key: 'tasks', label: t('workflow.tasksTab') },
    { key: 'templates', label: t('workflow.templatesTab') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('workflow.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('workflow.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                'whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors',
                tab === tb.key
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              )}
            >
              {tb.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {tab === 'active' && <ActiveWorkflows />}
      {tab === 'tasks' && <MyTasks />}
      {tab === 'templates' && <Templates />}
    </div>
  );
}

function ActiveWorkflows() {
  const { t } = useTranslation();
  const { data, isLoading } = useWorkflowInstances();

  if (isLoading) return <LoadingSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('workflow.noWorkflows')} />;

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.name')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.template')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.currentStep')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.startedAt')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((wf: any) => (
            <tr key={wf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{wf.name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{wf.template_name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{wf.current_step ?? '-'}</td>
              <td className="px-4 py-3"><StatusPill status={wf.status} /></td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{wf.started_at ? new Date(wf.started_at).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyTasks() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyTasks();

  if (isLoading) return <LoadingSkeleton />;

  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState message={t('workflow.noTasks')} />;

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.taskName')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.workflow')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.dueDate')}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('workflow.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((task: any) => (
            <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{task.name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{task.workflow_name}</td>
              <td className="px-4 py-3"><StatusPill status={task.status} /></td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
              <td className="px-4 py-3">
                {task.status === 'pending' && (
                  <div className="flex gap-2">
                    <button className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      {t('workflow.approve')}
                    </button>
                    <button className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                      {t('workflow.reject')}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Templates() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_TEMPLATES.map((tpl) => (
        <div key={tpl.id} className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tpl.description}</p>
            </div>
            <span className="pill-slate text-xs">{tpl.steps} {t('workflow.steps')}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors">
              {t('workflow.startWorkflow')}
            </button>
            <button className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {t('workflow.edit')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
