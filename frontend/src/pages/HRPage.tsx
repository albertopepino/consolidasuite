import { useState, useRef, useCallback } from 'react';
import { useSites, useHeadcount, usePayroll, useUploadSalaries } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/i18n/useTranslation';

const TABS = ['headcount', 'payroll', 'upload'] as const;
type Tab = (typeof TABS)[number];

const EMPLOYMENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  full_time: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  part_time: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  contractor: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
  intern: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-slate-500">
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
      <svg className="h-12 w-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// KPI Card
// ────────────────────────────────────────────────────────────────────────────

function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-800/70">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
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
  // If we got department-level summary from API but no employee list, show departments
  const deptList = departments.length > 0 ? departments : Object.keys(byDept).map((name) => ({ name, employees: byDept[name] }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard label={t('hr.totalHeadcount')} value={summary.total_headcount ?? '--'} color="text-slate-900 dark:text-white" />
          <KPICard label={t('hr.fteCount')} value={summary.fte_count != null ? Number(summary.fte_count).toFixed(1) : '--'} color="text-blue-600 dark:text-blue-400" />
          <KPICard label="Contractors" value={summary.contractors ?? '--'} color="text-violet-600 dark:text-violet-400" />
          <KPICard label="Avg FTE Ratio" value={summary.avg_fte_ratio != null ? `${(Number(summary.avg_fte_ratio) * 100).toFixed(1)}%` : '--'} color="text-emerald-600 dark:text-emerald-400" />
        </div>
      )}

      {/* Employee table grouped by department */}
      {deptList.map((dept: any) => {
        const deptName = dept.name || dept.department || 'Unassigned';
        const deptEmployees = dept.employees || byDept[deptName] || [];
        return (
          <div key={deptName} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/80">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{deptName}</h3>
              <span className="text-xs text-slate-400">({deptEmployees.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.position')}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.employmentType')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">FTE</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.startDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {deptEmployees.map((emp: any, idx: number) => {
                    const typeKey = emp.employment_type || 'full_time';
                    const typeColors = EMPLOYMENT_TYPE_COLORS[typeKey] || EMPLOYMENT_TYPE_COLORS.full_time;
                    return (
                      <tr key={emp.id || idx} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="px-5 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                          {emp.full_name || emp.name || '--'}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {emp.position || emp.job_title || '--'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${typeColors.bg} ${typeColors.text}`}>
                            {typeKey.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                          {emp.fte != null ? Number(emp.fte).toFixed(2) : '--'}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">
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

  return (
    <div className="space-y-6">
      {/* Summary KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard label={t('hr.totalGross')} value={formatCurrency(summary.total_gross)} color="text-slate-900 dark:text-white" />
          <KPICard label={t('hr.totalNet')} value={formatCurrency(summary.total_net)} color="text-blue-600 dark:text-blue-400" />
          <KPICard label="Total Employer Cost" value={formatCurrency(summary.total_employer_cost)} color="text-amber-600 dark:text-amber-400" />
          <KPICard label="Total CTC" value={formatCurrency(summary.total_ctc)} color="text-emerald-600 dark:text-emerald-400" />
        </div>
      )}

      {/* Department / Site table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {isConsolidated ? 'By Site' : `By ${t('hr.department')}`}
          </h3>
          {isConsolidated && (
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              FX converted
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isConsolidated ? t('common.site') : t('hr.department')}
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.totalHeadcount')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.totalGross')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.totalNet')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('hr.totalCost')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {departments.map((row: any, idx: number) => (
                <tr key={row.name || row.site_name || idx} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {row.name || row.site_name || row.department || '--'}
                    {isConsolidated && row.currency && (
                      <span className="ml-2 text-[10px] text-slate-400">({row.currency})</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                    {row.headcount ?? '--'}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_gross)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_net)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.total_cost ?? row.total_employer_cost)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
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

  return (
    <div className="space-y-6">
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('hr.upload')}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload a CSV file with salary records for a specific site.
        </p>

        <div className="mt-6 space-y-4">
          {/* Site selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.site')}</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              <option value="">{t('common.selectSite')}</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          {/* File input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">CSV File</label>
            <div
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 transition-colors hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-600 dark:bg-slate-700/30 dark:hover:border-blue-500 dark:hover:bg-blue-900/10"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {selectedFile ? selectedFile.name : 'Click to select a CSV file'}
                </p>
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
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleUpload}
              disabled={!selectedSite || !selectedFile || uploadMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Upload
                </>
              )}
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
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
            className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
              uploadResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
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

  const [activeTab, setActiveTab] = useState<Tab>('headcount');
  const [siteId, setSiteId] = useState<string | null>(null);

  const tabLabels: Record<Tab, string> = {
    headcount: t('hr.headcount'),
    payroll: t('hr.payroll'),
    upload: t('hr.upload'),
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('hr.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage headcount, payroll, and salary data across all sites.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {tabLabels[tab]}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      {/* Controls for headcount / payroll tabs */}
      {activeTab !== 'upload' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.site')}</label>
            <select
              value={siteId || ''}
              onChange={(e) => setSiteId(e.target.value || null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">{t('common.consolidated')}</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          {activeTab === 'payroll' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.year')}</label>
                <select
                  value={selectedYear}
                  disabled
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option>{selectedYear}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.period')}</label>
                <select
                  value={selectedMonth}
                  disabled
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
