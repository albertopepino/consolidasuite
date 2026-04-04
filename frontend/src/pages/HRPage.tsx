import { useState, useRef, useCallback } from 'react';
import { useSites, useHeadcount, usePayroll, useUploadSalaries } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/utils/cn';

const TABS = ['headcount', 'payroll', 'upload'] as const;
type Tab = (typeof TABS)[number];

const EMPLOYMENT_TYPE_STYLES: Record<string, { gradient: string; dot: string }> = {
  full_time: { gradient: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white', dot: 'bg-blue-200' },
  part_time: { gradient: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white', dot: 'bg-amber-200' },
  contractor: { gradient: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white', dot: 'bg-violet-200' },
  intern: { gradient: 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-white', dot: 'bg-cyan-200' },
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const INITIAL_COLORS = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
  'from-indigo-400 to-indigo-600',
  'from-teal-400 to-teal-600',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
        <svg className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 1 : Headcount
// ────────────────────────────────────────────────────────────────────────────

function HeadcountTab({ siteId }: { siteId: string | null }) {
  const { t } = useTranslation();
  const { data, isLoading } = useHeadcount(siteId);

  if (isLoading) return <Spinner />;

  const summary = data?.summary;
  const departments: any[] = data?.departments ?? [];
  const employees: any[] = data?.employees ?? [];

  if (!summary && employees.length === 0) {
    return <EmptyState message={t('common.noData')} />;
  }

  // Group employees by department
  const byDept: Record<string, any[]> = {};
  for (const emp of employees) {
    const dept = emp.department || 'Unassigned';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(emp);
  }
  const deptList = departments.length > 0 ? departments : Object.keys(byDept).map((name) => ({ name, employees: byDept[name] }));

  const DEPT_GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-sky-600',
  ];

  return (
    <div className="space-y-8">
      {/* Department cards grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deptList.map((dept: any, deptIdx: number) => {
          const deptName = dept.name || dept.department || 'Unassigned';
          const deptEmployees = dept.employees || byDept[deptName] || [];
          const headcount = dept.headcount ?? deptEmployees.length;
          const fte = dept.fte_count ?? deptEmployees.reduce((s: number, e: any) => s + (Number(e.fte) || 0), 0);
          const gradient = DEPT_GRADIENTS[deptIdx % DEPT_GRADIENTS.length];

          return (
            <div
              key={deptName}
              className="group glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]"
              style={{ animationDelay: `${deptIdx * 80}ms`, animationFillMode: 'backwards' }}
            >
              <div className={cn('bg-gradient-to-r p-4', gradient)}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{t('hr.department')}</p>
                <h3 className="mt-1 text-lg font-bold text-white font-display">{deptName}</h3>
              </div>
              <div className="flex items-center gap-6 p-5">
                <div className="text-center">
                  <p className="text-3xl font-bold font-display tabular-nums text-slate-900 dark:text-white">{headcount}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.headcount')}</p>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                    {fte.toFixed ? fte.toFixed(1) : fte} FTE
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee tables per department */}
      {deptList.map((dept: any, deptIdx: number) => {
        const deptName = dept.name || dept.department || 'Unassigned';
        const deptEmployees = dept.employees || byDept[deptName] || [];
        if (deptEmployees.length === 0) return null;

        return (
          <div
            key={`table-${deptName}`}
            className="glass-card overflow-hidden opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: `${(deptList.length + deptIdx) * 60}ms`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
              </div>
              <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200">{deptName}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{deptEmployees.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.employee') || 'Employee'}</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.position')}</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.employmentType')}</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.startDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deptEmployees.map((emp: any, idx: number) => {
                    const name = emp.full_name || emp.name || '--';
                    const typeKey = emp.employment_type || 'full_time';
                    const typeStyle = EMPLOYMENT_TYPE_STYLES[typeKey] || EMPLOYMENT_TYPE_STYLES.full_time;
                    const initials = getInitials(name);
                    const colorIdx = hashStr(name) % INITIAL_COLORS.length;

                    return (
                      <tr
                        key={emp.id || idx}
                        className="group border-b border-slate-50 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-transparent dark:border-slate-800/50 dark:hover:from-slate-700/30 dark:hover:to-transparent opacity-0 animate-[fadeIn_0.35s_ease-out_forwards]"
                        style={{ animationDelay: `${idx * 35}ms`, animationFillMode: 'backwards' }}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm', INITIAL_COLORS[colorIdx])}>
                              {initials}
                            </div>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                          {emp.position || emp.job_title || '--'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm', typeStyle.gradient)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', typeStyle.dot)} />
                            {typeKey.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(emp.start_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 2 : Payroll
// ────────────────────────────────────────────────────────────────────────────

function PayrollTab({ siteId, year, month }: { siteId: string | null; year: number; month: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = usePayroll(siteId, year, month);

  if (isLoading) return <Spinner />;

  const summary = data?.summary;
  const departments: any[] = data?.departments ?? data?.sites ?? [];

  if (!summary && departments.length === 0) {
    return <EmptyState message={t('common.noData')} />;
  }

  const isConsolidated = !siteId;

  const summaryDefs = [
    { label: t('hr.totalGross'), value: formatCurrency(summary?.total_gross), gradient: 'from-blue-500 to-indigo-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: t('hr.totalNet'), value: formatCurrency(summary?.total_net), gradient: 'from-emerald-500 to-teal-600', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z' },
    { label: t('hr.totalCost') || 'Employer Cost', value: formatCurrency(summary?.total_employer_cost), gradient: 'from-amber-500 to-orange-600', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Total CTC', value: formatCurrency(summary?.total_ctc), gradient: 'from-violet-500 to-purple-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  ];

  return (
    <div className="space-y-8">
      {/* Gradient summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {summaryDefs.map((card, i) => (
            <div
              key={i}
              className={cn('group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]', card.gradient)}
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
            >
              <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150" />
              <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
              <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} /></svg>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-white/70">{card.label}</p>
              <p className="mt-1 text-2xl font-bold font-display tabular-nums font-mono">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Department breakdown table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200">
            {isConsolidated ? 'By Site' : `By ${t('hr.department')}`}
          </h3>
          {isConsolidated && (
            <span className="rounded-full bg-gradient-to-r from-amber-100 to-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:from-amber-900/40 dark:to-amber-800/40 dark:text-amber-400">
              FX converted
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {isConsolidated ? t('common.site') : t('hr.department')}
                </th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.totalHeadcount')}</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.totalGross')}</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.totalNet')}</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t('hr.totalCost') || 'Employer Cost'}</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Avg Salary</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((row: any, idx: number) => (
                <tr
                  key={row.name || row.site_name || idx}
                  className="group border-b border-slate-50 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:border-slate-800/50 dark:hover:from-slate-700/20 dark:hover:to-transparent opacity-0 animate-[fadeIn_0.35s_ease-out_forwards]"
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'backwards' }}
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {row.name || row.site_name || row.department || '--'}
                    {isConsolidated && row.currency && (
                      <span className="ml-2 text-[10px] font-medium text-slate-400">({row.currency})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {row.headcount ?? '--'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_gross)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_net)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_cost ?? row.total_employer_cost)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.avg_salary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 3 : Upload Salaries
// ────────────────────────────────────────────────────────────────────────────

function UploadTab() {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const uploadMutation = useUploadSalaries();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = useCallback(async () => {
    if (!selectedSite || !selectedFile) return;
    setUploadResult(null);
    try {
      await uploadMutation.mutateAsync({ siteId: selectedSite, file: selectedFile });
      setUploadResult({ type: 'success', text: 'Salary data uploaded successfully.' });
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setUploadResult({ type: 'error', text: 'Upload failed. Please check the file format and try again.' });
    }
  }, [selectedSite, selectedFile, uploadMutation]);

  const handleDownloadTemplate = useCallback(() => {
    const csvContent = 'employee_id,full_name,department,position,employment_type,fte,gross_salary,net_salary,employer_cost,currency,period_year,period_month\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="max-w-2xl glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-5">
          <h3 className="text-lg font-bold font-display text-white">{t('hr.upload')}</h3>
          <p className="mt-1 text-sm text-white/70">
            Upload a CSV file with salary records for a specific site.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Site selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('common.site')}</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">{t('common.selectSite')}</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          {/* Drag-and-drop zone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">CSV File</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'group relative flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition-all duration-300',
                isDragOver
                  ? 'border-blue-500 bg-blue-50/50 scale-[1.01] dark:bg-blue-900/10'
                  : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-900/10'
                    : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20 dark:border-slate-600 dark:bg-slate-800/30 dark:hover:border-blue-500 dark:hover:bg-blue-900/10'
              )}
            >
              <div className="text-center">
                <div className={cn(
                  'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300',
                  isDragOver
                    ? 'bg-gradient-to-br from-blue-500 to-violet-600 scale-110'
                    : selectedFile
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : 'bg-gradient-to-br from-slate-200 to-slate-300 group-hover:from-blue-500 group-hover:to-violet-600 dark:from-slate-600 dark:to-slate-700'
                )}>
                  {selectedFile ? (
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="h-6 w-6 text-slate-500 transition-colors group-hover:text-white dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {selectedFile ? selectedFile.name : 'Drop CSV here or click to browse'}
                </p>
                {!selectedFile && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Supports .csv files</p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleUpload}
              disabled={!selectedSite || !selectedFile || uploadMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
            >
              {uploadMutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('hr.upload')}
                </>
              )}
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </button>
          </div>
        </div>

        {/* Upload result message */}
        {uploadResult && (
          <div
            className={cn(
              'mx-6 mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold',
              uploadResult.type === 'success'
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 dark:from-emerald-900/20 dark:to-teal-900/20 dark:text-emerald-400'
                : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 dark:from-red-900/20 dark:to-rose-900/20 dark:text-red-400'
            )}
          >
            {uploadResult.type === 'success' ? (
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            )}
            {uploadResult.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────

export function HRPage() {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const { data: headcountData } = useHeadcount(null);

  const [activeTab, setActiveTab] = useState<Tab>('headcount');
  const [siteId, setSiteId] = useState<string | null>(null);

  const summary = headcountData?.summary;

  const tabLabels: Record<Tab, { label: string; icon: string }> = {
    headcount: { label: t('hr.headcount'), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    payroll: { label: t('hr.payroll'), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    upload: { label: t('hr.upload'), icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  };

  const heroMetrics = [
    { label: t('hr.totalHeadcount'), value: summary?.total_headcount ?? '--' },
    { label: t('hr.fteCount'), value: summary?.fte_count != null ? Number(summary.fte_count).toFixed(1) : '--' },
    { label: 'Avg Salary', value: summary?.avg_salary != null ? formatCurrency(summary.avg_salary) : '--' },
    { label: 'Total Payroll', value: summary?.total_payroll != null ? formatCurrency(summary.total_payroll) : '--' },
  ];

  return (
    <div className="space-y-8 animate-in">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 px-8 py-10 shadow-xl shadow-blue-900/20">
        <div className="absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute right-20 top-20 h-20 w-20 rounded-full bg-white/5" />

        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight text-white font-display lg:text-4xl">
            {t('hr.title') || 'People & Payroll'}
          </h1>
          <p className="mt-2 text-sm text-blue-100/70">
            Manage headcount, payroll, and salary data across all sites.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {heroMetrics.map((m, i) => (
              <div key={i} className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 transition-all duration-300 hover:bg-white/15">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-100/60">{m.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums font-mono text-white">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Segmented control tabs */}
      <div className="inline-flex rounded-xl bg-slate-100/80 p-1 backdrop-blur dark:bg-slate-800/80">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200',
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tabLabels[tab].icon} />
            </svg>
            {tabLabels[tab].label}
          </button>
        ))}
      </div>

      {/* Controls for headcount / payroll tabs */}
      {activeTab !== 'upload' && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('common.site')}</label>
            <select
              value={siteId || ''}
              onChange={(e) => setSiteId(e.target.value || null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">{t('common.consolidated')}</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          {activeTab === 'payroll' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('common.year')}</label>
                <select
                  value={selectedYear}
                  disabled
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option>{selectedYear}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('common.period')}</label>
                <select
                  value={selectedMonth}
                  disabled
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option>{String(selectedMonth).padStart(2, '0')}</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'headcount' && <HeadcountTab siteId={siteId} />}
      {activeTab === 'payroll' && <PayrollTab siteId={siteId} year={selectedYear} month={selectedMonth} />}
      {activeTab === 'upload' && <UploadTab />}
    </div>
  );
}
