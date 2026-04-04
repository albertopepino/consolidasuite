import { useState, useCallback } from 'react';
import { useBudget, useSaveBudget } from '@/api/hooks';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/utils/cn';
import type { BudgetEntry } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function BudgetTable() {
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const currencyMode = useDashboardStore((s) => s.currencyMode);

  const { data: entries, isLoading } = useBudget({
    siteId: selectedSiteId || '',
    year: selectedYear,
  });

  const saveBudget = useSaveBudget();
  const [editedEntries, setEditedEntries] = useState<Map<string, number>>(new Map());
  const [isDirty, setIsDirty] = useState(false);

  const handleCellEdit = useCallback(
    (entryId: string, month: number, value: string) => {
      const numValue = parseFloat(value) || 0;
      const key = `${entryId}-${month}`;
      setEditedEntries((prev) => {
        const next = new Map(prev);
        next.set(key, numValue);
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const getCellValue = (entry: BudgetEntry, _month: number): number => {
    const key = `${entry.id}-${_month}`;
    if (editedEntries.has(key)) {
      return editedEntries.get(key)!;
    }
    return currencyMode === 'EUR' ? entry.budgetAmountEUR : entry.budgetAmount;
  };

  const getVarianceBadge = (entry: BudgetEntry) => {
    if (entry.variancePercent === undefined) return null;
    const pct = entry.variancePercent;
    if (Math.abs(pct) < 1) return <Badge variant="neutral">{pct.toFixed(1)}%</Badge>;
    return pct > 0 ? (
      <Badge variant="positive">+{pct.toFixed(1)}%</Badge>
    ) : (
      <Badge variant="negative">{pct.toFixed(1)}%</Badge>
    );
  };

  const handleSave = () => {
    if (!selectedSiteId || !entries) return;
    saveBudget.mutate(
      { siteId: selectedSiteId, entries },
      {
        onSuccess: () => {
          setEditedEntries(new Map());
          setIsDirty(false);
        },
      }
    );
  };

  if (!selectedSiteId) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Select a site to view budget data
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner label="Loading budget data..." />;
  }

  // Group entries by category
  const grouped = (entries || []).reduce<Record<string, BudgetEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {entries?.length || 0} line items for {selectedYear}
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
          <Button
            size="sm"
            variant="glass"
            onClick={() => {
              setEditedEntries(new Map());
              setIsDirty(false);
            }}
            disabled={!isDirty}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            loading={saveBudget.isPending}
          >
            Save Budget
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900">
              <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Account
              </th>
              {MONTHS.map((month) => (
                <th
                  key={month}
                  className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {month}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Variance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {Object.entries(grouped).map(([category, catEntries]) => (
              <CategorySection
                key={category}
                category={category}
                entries={catEntries}
                onCellEdit={handleCellEdit}
                getCellValue={getCellValue}
                getVarianceBadge={getVarianceBadge}
                currencyMode={currencyMode}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  entries,
  onCellEdit,
  getCellValue,
  getVarianceBadge,
  currencyMode,
}: {
  category: string;
  entries: BudgetEntry[];
  onCellEdit: (entryId: string, month: number, value: string) => void;
  getCellValue: (entry: BudgetEntry, month: number) => number;
  getVarianceBadge: (entry: BudgetEntry) => React.ReactNode;
  currencyMode: string;
}) {
  const currency = currencyMode === 'EUR' ? 'EUR' as const : 'EUR' as const;

  return (
    <>
      {/* Category header row */}
      <tr className="bg-slate-50/50 dark:bg-slate-800/50">
        <td
          colSpan={14}
          className="sticky left-0 z-10 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
        >
          {category}
        </td>
      </tr>
      {entries.map((entry) => {
        const monthValues = Array.from({ length: 12 }, (_, i) =>
          getCellValue(entry, i + 1)
        );
        const total = monthValues.reduce((sum, v) => sum + v, 0);

        return (
          <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
              <span className="font-mono text-xs text-slate-400 mr-2">
                {entry.accountCode}
              </span>
              {entry.accountName}
            </td>
            {monthValues.map((value, i) => (
              <td key={i} className="px-1 py-1">
                <input
                  type="number"
                  value={value || ''}
                  onChange={(e) => onCellEdit(entry.id, i + 1, e.target.value)}
                  className={cn(
                    'w-full rounded border-0 bg-transparent px-2 py-1 text-right text-xs tabular-nums',
                    'text-slate-700 dark:text-slate-300',
                    'focus:bg-brand-50 focus:outline-none focus:ring-1 focus:ring-brand-500/30 dark:focus:bg-brand-900/20',
                    'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  )}
                  step="0.01"
                />
              </td>
            ))}
            <td className="px-4 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {formatCurrency(total, currency, { compact: true })}
            </td>
            <td className="px-4 py-2 text-right">
              {getVarianceBadge(entry)}
            </td>
          </tr>
        );
      })}
    </>
  );
}
