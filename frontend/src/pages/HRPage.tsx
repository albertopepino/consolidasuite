import { useState, useRef, useCallback } from 'react';
import { useSites, useHeadcount, usePayroll, useUploadSalaries } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/utils/cn';
import { ExportButton } from '@/components/ui/ExportButton';

const TABS = ['headcount', 'payroll', 'upload'] as const;
type Tab = (typeof TABS)[number];

const EMPLOYMENT_TYPE_PILLS: Record<string, string> = {
  full_time: 'pill-blue',
  part_time: 'pill-amber',
  contractor: 'pill-violet',
  intern: 'pill-green',
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-slate-400">
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
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

  const byDept: Record<string, any[]> = {};
  for (const emp of employees) {
    const dept = emp.department || 'Unassigned';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(emp);
  }
  const deptList = departments.length > 0 ? departments : Object.keys(byDept).map((name) => ({ name, employees: byDept[name] }));

  return (
    <div className="space-y-6">
      {/* Department summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deptList.map((dept: any) => {
          const deptName = dept.name || dept.department || 'Unassigned';
          const deptEmployees = dept.employees || byDept[deptName] || [];
          const headcount = dept.headcount ?? deptEmployees.length;
          const fte = dept.fte_count ?? deptEmployees.reduce((s: number, e: any) => s + (Number(e.fte) || 0), 0);

          return (
            <div key={deptName} className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.department')}</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{deptName}</h3>
              <div className="mt-3 flex items-center gap-4">
                <div>
                  <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">{headcount}</span>
                  <span className="ml-1 text-xs text-slate-400">{t('hr.headcount')}</span>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                <span className="pill-blue">
                  {fte.toFixed ? fte.toFixed(1) : fte} FTE
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee tables per department */}
      {deptList.map((dept: any) => {
        const deptName = dept.name || dept.department || 'Unassigned';
        const deptEmployees = dept.employees || byDept[deptName] || [];
        if (deptEmployees.length === 0) return null;

        return (
          <div key={`table-${deptName}`} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{deptName}</h3>
              <span className="pill-slate">{deptEmployees.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.employee') || 'Employee'}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.position')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.employmentType')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.startDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deptEmployees.map((emp: any, idx: number) => {
                    const name = emp.full_name || emp.name || '--';
                    const typeKey = emp.employment_type || 'full_time';
                    const pillClass = EMPLOYMENT_TYPE_PILLS[typeKey] || 'pill-slate';
                    const initials = getInitials(name);

                    return (
                      <tr
                        key={emp.id || idx}
                        className="border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-700/20"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {initials}
                            </div>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {emp.position || emp.job_title || '--'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={pillClass}>
                            {typeKey.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
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
    { label: t('hr.totalGross'), value: formatCurrency(summary?.total_gross), border: 'border-l-blue-500' },
    { label: t('hr.totalNet'), value: formatCurrency(summary?.total_net), border: 'border-l-emerald-500' },
    { label: t('hr.totalCost') || 'Employer Cost', value: formatCurrency(summary?.total_employer_cost), border: 'border-l-amber-500' },
    { label: 'Total CTC', value: formatCurrency(summary?.total_ctc), border: 'border-l-violet-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryDefs.map((card, i) => (
            <div key={i} className={cn('card border-l-4 p-5', card.border)}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Department breakdown table */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {isConsolidated ? 'By Site' : `By ${t('hr.department')}`}
          </h3>
          {isConsolidated && (
            <span className="pill-amber">FX converted</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isConsolidated ? t('common.site') : t('hr.department')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.totalHeadcount')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.totalGross')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.totalNet')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hr.totalCost') || 'Employer Cost'}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Salary</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((row: any, idx: number) => (
                <tr
                  key={row.name || row.site_name || idx}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-700/20"
                >
                  <td className="px-6 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {row.name || row.site_name || row.department || '--'}
                    {isConsolidated && row.currency && (
                      <span className="ml-2 text-[10px] font-medium text-slate-400">({row.currency})</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {row.headcount ?? '--'}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_gross)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_net)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_cost ?? row.total_employer_cost)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
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
      <div className="max-w-2xl card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('hr.upload')}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload a CSV file with salary records for a specific site.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Site selector */}
          <div className="flex flex-col gap-1.5">
            <label className="input-label">{t('common.site')}</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="input"
            >
              <option value="">{t('common.selectSite')}</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          {/* Drag-and-drop zone */}
          <div className="flex flex-col gap-1.5">
            <label className="input-label">CSV File</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors',
                isDragOver
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'
                  : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-900/10'
                    : 'border-slate-200 bg-slate-50/50 hover:border-brand-400 dark:border-slate-600 dark:bg-slate-800/30'
              )}
            >
              <div className="text-center">
                <div className={cn(
                  'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
                  selectedFile
                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                    : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  {selectedFile ? (
                    <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="btn-ghost inline-flex items-center gap-2"
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
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
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

  const tabLabels: Record<Tab, string> = {
    headcount: t('hr.headcount'),
    payroll: t('hr.payroll'),
    upload: t('hr.upload'),
  };

  const statsDefs = [
    { label: t('hr.totalHeadcount'), value: summary?.total_headcount ?? '--' },
    { label: t('hr.fteCount'), value: summary?.fte_count != null ? Number(summary.fte_count).toFixed(1) : '--' },
    { label: 'Avg Salary', value: summary?.avg_salary != null ? formatCurrency(summary.avg_salary) : '--' },
    { label: 'Total Payroll', value: summary?.total_payroll != null ? formatCurrency(summary.total_payroll) : '--' },
  ];

  return (
    <div className="page-enter space-y-6">
      {/* Simple page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('hr.title') || 'People & Payroll'}
        </h1>
        <div className="flex items-center gap-2">
          {siteId && (
            <>
              <ExportButton
                endpoint={`/export/employees/${siteId}`}
                filename={`employees_${siteId}`}
              />
              <ExportButton
                endpoint={`/export/salaries/${siteId}`}
                filename={`salaries_${siteId}_${selectedYear}_${selectedMonth}`}
                params={{ year: String(selectedYear), month: String(selectedMonth) }}
              />
            </>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage headcount, payroll, and salary data across all sites.
        </p>
      </div>

      {/* Stats row - 4 simple cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsDefs.map((m, i) => (
          <div key={i} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Underline tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Controls for headcount / payroll tabs */}
      {activeTab !== 'upload' && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="input-label">{t('common.site')}</label>
            <select
              value={siteId || ''}
              onChange={(e) => setSiteId(e.target.value || null)}
              className="input"
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
                <label className="input-label">{t('common.year')}</label>
                <select value={selectedYear} disabled className="input">
                  <option>{selectedYear}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">{t('common.period')}</label>
                <select value={selectedMonth} disabled className="input">
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
