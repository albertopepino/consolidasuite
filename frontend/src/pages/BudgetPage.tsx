import { BudgetTable } from '@/components/budget/BudgetTable';
import { useTranslation } from '@/i18n/useTranslation';

export function BudgetPage() {
  const { t } = useTranslation();
  return (
    <div className="page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white">
            {t('budget.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('budget.subtitle')}
          </p>
        </div>
      </div>

      {/* Budget table */}
      <BudgetTable />
    </div>
  );
}
