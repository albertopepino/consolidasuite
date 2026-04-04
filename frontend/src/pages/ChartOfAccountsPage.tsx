import { useState, useMemo, useCallback, useRef } from 'react';
import {
  useGroupAccounts,
  useSiteAccounts,
  useAccountMappings,
  useSaveMappings,
  useSites,
  useUploadGroupCoA,
  useUploadSiteCoA,
} from '@/api/hooks';
import type { GroupAccountResponse, SiteAccountResponse } from '@/api/hooks';
import { useTranslation } from '@/i18n/useTranslation';

const ACCOUNT_TYPE_PILL: Record<string, string> = {
  asset: 'pill-blue',
  liability: 'pill-red',
  equity: 'pill-violet',
  revenue: 'pill-green',
  expense: 'pill-amber',
};

function AccountTypeBadge({ type }: { type: string }) {
  const pill = ACCOUNT_TYPE_PILL[type] || 'pill-slate';
  return (
    <span className={`${pill} capitalize`}>
      {type}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SmallSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function MessageBanner({ message }: { message: { type: 'success' | 'error'; text: string } }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm font-medium ${
        message.type === 'success'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      }`}
    >
      {message.text}
    </div>
  );
}

function downloadTemplate() {
  const csv = 'code,name,account_type,parent_code,display_order\n1000,Cash & Bank Balances,asset,,10\n1100,Accounts Receivable,asset,,20\n2000,Accounts Payable,liability,,30\n3000,Share Capital,equity,,40\n4000,Sales Revenue,revenue,,50\n5000,Cost of Goods Sold,expense,,60\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chart_of_accounts_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ChartOfAccountsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'group' | 'site' | 'mapping'>('group');

  const tabs = [
    { key: 'group' as const, label: t('accounts.groupAccounts') },
    { key: 'site' as const, label: t('accounts.siteAccounts') },
    { key: 'mapping' as const, label: t('accounts.mappingMatrix') },
  ];

  return (
    <div className="page-enter space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
          {t('accounts.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage the group chart of accounts and map site-specific accounts for consolidation.
        </p>
      </div>

      {/* Segmented Control Tabs */}
      <div className="segmented-control">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'active' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'group' && <GroupAccountsTab />}
      {activeTab === 'site' && <SiteAccountsTab />}
      {activeTab === 'mapping' && <MappingMatrixTab />}
    </div>
  );
}

// ─── Group Accounts Tab ────────────────────────────────────────────────────

function GroupAccountsTab() {
  const { t } = useTranslation();
  const { data: groupAccounts, isLoading } = useGroupAccounts();
  const uploadMutation = useUploadGroupCoA();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMessage(null);
    try {
      const result = await uploadMutation.mutateAsync(file);
      setUploadMessage({
        type: 'success',
        text: `Upload complete: ${result.created} created, ${result.updated} updated.${result.errors.length > 0 ? ` ${result.errors.length} error(s).` : ''}`,
      });
    } catch {
      setUploadMessage({ type: 'error', text: 'Failed to upload file. Please check the format and try again.' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadMutation]);

  // Group by account_type for section headers
  const sections = useMemo(() => {
    if (!groupAccounts) return [];
    const order = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const grouped: Record<string, GroupAccountResponse[]> = {};
    for (const acct of groupAccounts) {
      const type = acct.account_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(acct);
    }
    return order.filter((t) => grouped[t]).map((t) => ({ type: t, accounts: grouped[t] }));
  }, [groupAccounts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-slate-500">
          <Spinner />
          Loading group accounts...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload controls */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="btn-primary"
        >
          {uploadMutation.isPending ? (
            <>
              <SmallSpinner />
              Uploading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('accounts.uploadCsv')}
            </>
          )}
        </button>
        <button
          onClick={downloadTemplate}
          className="btn-ghost"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('accounts.downloadTemplate')}
        </button>
      </div>

      {uploadMessage && <MessageBanner message={uploadMessage} />}

      {sections.map((section) => {
        const sectionPill = ACCOUNT_TYPE_PILL[section.type] || 'pill-slate';
        return (
          <div key={section.type} className="glass-card overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className={`text-sm font-semibold font-display capitalize text-slate-700 dark:text-slate-200`}>{section.type}</h3>
              <span className={`${sectionPill} !text-[10px]`}>
                {section.accounts.length} accounts
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {t('accounts.code')}
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {t('accounts.name')}
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {t('accounts.type')}
                    </th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {t('common.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {section.accounts.map((acct) => (
                    <tr
                      key={acct.id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {acct.code}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-sm font-medium text-slate-800 dark:text-slate-200"
                          style={{ paddingLeft: acct.parent_code ? '1.5rem' : '0' }}
                        >
                          {acct.parent_code && (
                            <span className="mr-1.5 text-slate-300 dark:text-slate-600">|--</span>
                          )}
                          {acct.name}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <AccountTypeBadge type={acct.account_type} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        {acct.is_active ? (
                          <span className="pill-green">
                            <span className="dot" />
                            {t('common.active')}
                          </span>
                        ) : (
                          <span className="pill-slate">
                            {t('common.inactive')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Site Accounts Tab ────────────────────────────────────────────────────

function SiteAccountsTab() {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const [siteId, setSiteId] = useState<string>('');
  const { data: siteAccounts, isLoading } = useSiteAccounts(siteId);
  const uploadMutation = useUploadSiteCoA();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !siteId) return;
    setUploadMessage(null);
    try {
      const result = await uploadMutation.mutateAsync({ siteId, file });
      setUploadMessage({
        type: 'success',
        text: `Upload complete: ${result.created} created, ${result.updated} updated.${result.errors.length > 0 ? ` ${result.errors.length} error(s).` : ''}`,
      });
    } catch {
      setUploadMessage({ type: 'error', text: 'Failed to upload file. Please check the format and try again.' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [siteId, uploadMutation]);

  // Group by account_type
  const sections = useMemo(() => {
    if (!siteAccounts) return [];
    const order = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const grouped: Record<string, SiteAccountResponse[]> = {};
    for (const acct of siteAccounts) {
      const type = acct.account_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(acct);
    }
    return order.filter((t) => grouped[t]).map((t) => ({ type: t, accounts: grouped[t] }));
  }, [siteAccounts]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="input-label">Site</label>
          <select
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setUploadMessage(null); }}
            className="input"
          >
            <option value="">{t('common.selectSite')}</option>
            {sites?.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {siteId && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleUpload}
              className="hidden"
            />
            <div className="flex items-center gap-3 self-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="btn-primary"
              >
                {uploadMutation.isPending ? (
                  <>
                    <SmallSpinner />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('accounts.uploadCsv')}
                  </>
                )}
              </button>
              <button
                onClick={downloadTemplate}
                className="btn-ghost"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('accounts.downloadTemplate')}
              </button>
            </div>
          </>
        )}
      </div>

      {uploadMessage && <MessageBanner message={uploadMessage} />}

      {/* No site selected */}
      {!siteId && (
        <div className="glass-card border-dashed flex flex-col items-center justify-center py-16">
          <svg className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Select a site to view its local accounts.
          </p>
        </div>
      )}

      {/* Loading */}
      {siteId && isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-500">
            <Spinner />
            Loading site accounts...
          </div>
        </div>
      )}

      {/* Account tables */}
      {siteId && !isLoading && sections.map((section) => {
        const sectionPill = ACCOUNT_TYPE_PILL[section.type] || 'pill-slate';
        return (
          <div key={section.type} className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold font-display capitalize text-slate-700 dark:text-slate-200">{section.type}</h3>
              <span className={`${sectionPill} !text-[10px]`}>
                {section.accounts.length} accounts
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('accounts.code')}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('accounts.name')}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('accounts.type')}</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {section.accounts.map((acct) => (
                    <tr key={acct.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{acct.code}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200" style={{ paddingLeft: acct.parent_code ? '1.5rem' : '0' }}>
                          {acct.parent_code && <span className="mr-1.5 text-slate-300 dark:text-slate-600">|--</span>}
                          {acct.name}
                        </span>
                      </td>
                      <td className="px-5 py-3"><AccountTypeBadge type={acct.account_type} /></td>
                      <td className="px-5 py-3 text-center">
                        {acct.is_active ? (
                          <span className="pill-green">
                            <span className="dot" />
                            {t('common.active')}
                          </span>
                        ) : (
                          <span className="pill-slate">
                            {t('common.inactive')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mapping Matrix Tab ────────────────────────────────────────────────────

function MappingMatrixTab() {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const { data: groupAccounts } = useGroupAccounts();
  const [siteId, setSiteId] = useState<string>('');
  const { data: siteAccounts } = useSiteAccounts(siteId);
  const { data: mappingData, isLoading: mappingLoading } = useAccountMappings(siteId);
  const saveMutation = useSaveMappings();

  // localMappings: groupAccountId -> siteAccountId (the reverse direction for the UI)
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Build the reverse lookup from mapping data: group_account_id -> site_account_id
  const mappingEntries = mappingData?.entries;
  useMemo(() => {
    if (mappingEntries) {
      const mapped: Record<string, string> = {};
      for (const entry of mappingEntries) {
        if (entry.group_account) {
          mapped[entry.group_account.id] = entry.site_account.id;
        }
      }
      setLocalMappings(mapped);
      setHasChanges(false);
    }
  }, [mappingEntries]);

  const handleMappingChange = useCallback((groupAccountId: string, siteAccountId: string) => {
    setLocalMappings((prev) => {
      const next = { ...prev };
      if (siteAccountId === '') {
        delete next[groupAccountId];
      } else {
        next[groupAccountId] = siteAccountId;
      }
      return next;
    });
    setHasChanges(true);
    setSaveMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!siteId) return;
    setSaveMessage(null);
    try {
      const mappings = Object.entries(localMappings).map(([groupAccountId, siteAccountId]) => ({
        site_account_id: siteAccountId,
        group_account_id: groupAccountId,
      }));
      await saveMutation.mutateAsync({ siteId, mappings });
      setHasChanges(false);
      setSaveMessage({ type: 'success', text: 'Mappings saved successfully.' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save mappings. Please try again.' });
    }
  }, [siteId, localMappings, saveMutation]);

  // Stats based on group accounts
  const stats = useMemo(() => {
    if (!groupAccounts) return { total: 0, mapped: 0, unmapped: 0 };
    const total = groupAccounts.length;
    const mapped = Object.keys(localMappings).length;
    return { total, mapped, unmapped: total - mapped };
  }, [groupAccounts, localMappings]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="input-label">Site</label>
          <select
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setSaveMessage(null); }}
            className="input"
          >
            <option value="">{t('common.selectSite')}</option>
            {sites?.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {siteId && groupAccounts && (
          <>
            {/* Stats bar with pills */}
            <div className="flex items-center gap-3">
              <span className="pill-slate">
                Total: <strong>{stats.total}</strong>
              </span>
              <span className="pill-green">
                <span className="dot" />
                {t('accounts.mapped')}: {stats.mapped}
              </span>
              <span className="pill-red">
                <span className="dot" />
                {t('accounts.unmapped')}: {stats.unmapped}
              </span>
            </div>

            {/* Save button */}
            <div className="ml-auto">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="btn-primary"
              >
                {saveMutation.isPending ? (
                  <>
                    <SmallSpinner />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('accounts.saveMappings')}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Save message */}
      {saveMessage && <MessageBanner message={saveMessage} />}

      {/* No site selected */}
      {!siteId && (
        <div className="glass-card border-dashed flex flex-col items-center justify-center py-16">
          <svg className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Select a site to view and edit its account mappings.
          </p>
        </div>
      )}

      {/* Loading */}
      {siteId && mappingLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-500">
            <Spinner />
            Loading mapping matrix...
          </div>
        </div>
      )}

      {/* Mapping Matrix Table */}
      {siteId && groupAccounts && !mappingLoading && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/80">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Group Code
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Group Account Name
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Site Account Mapping
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {t('common.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {groupAccounts.map((ga) => {
                  const isMapped = !!localMappings[ga.id];
                  return (
                    <tr
                      key={ga.id}
                      className={`transition-colors ${
                        isMapped
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-900/5 dark:hover:bg-emerald-900/10'
                          : 'bg-red-50/20 hover:bg-red-50/40 dark:bg-red-900/5 dark:hover:bg-red-900/10'
                      }`}
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {ga.code}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {ga.name}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <AccountTypeBadge type={ga.account_type} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <svg className="inline h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={localMappings[ga.id] || ''}
                          onChange={(e) => handleMappingChange(ga.id, e.target.value)}
                          className={`input w-full ${
                            isMapped
                              ? '!border-emerald-200 !bg-emerald-50/50 dark:!border-emerald-800 dark:!bg-emerald-900/10'
                              : '!border-red-200 !bg-red-50/50 dark:!border-red-800 dark:!bg-red-900/10'
                          }`}
                        >
                          <option value="">-- Unmapped --</option>
                          {siteAccounts?.map((sa) => (
                            <option key={sa.id} value={sa.id}>
                              {sa.code} - {sa.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isMapped ? (
                          <span className="pill-green">
                            <span className="dot" />
                            {t('accounts.mapped')}
                          </span>
                        ) : (
                          <span className="pill-red">
                            <span className="dot" />
                            {t('accounts.unmapped')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
