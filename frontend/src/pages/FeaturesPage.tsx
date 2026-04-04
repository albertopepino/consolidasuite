import { useFeatureStore } from '@/store/featureStore';
import { useTranslation } from '@/i18n/useTranslation';

interface FeatureItem {
  key: string;
  labelKey: string;
  descriptionKey: string;
}

interface FeatureGroup {
  titleKey: string;
  items: FeatureItem[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    titleKey: 'features.group.finance',
    items: [
      { key: 'finance.statements', labelKey: 'features.statements', descriptionKey: 'features.statementsDesc' },
      { key: 'finance.budget', labelKey: 'features.budget', descriptionKey: 'features.budgetDesc' },
      { key: 'finance.targets', labelKey: 'features.targets', descriptionKey: 'features.targetsDesc' },
      { key: 'finance.accounts', labelKey: 'features.accounts', descriptionKey: 'features.accountsDesc' },
      { key: 'finance.analytics', labelKey: 'features.analytics', descriptionKey: 'features.analyticsDesc' },
      { key: 'finance.upload', labelKey: 'features.upload', descriptionKey: 'features.uploadDesc' },
    ],
  },
  {
    titleKey: 'features.group.people',
    items: [
      { key: 'people.hr', labelKey: 'features.hr', descriptionKey: 'features.hrDesc' },
    ],
  },
  {
    titleKey: 'features.group.operations',
    items: [
      { key: 'operations.intercompany', labelKey: 'features.intercompany', descriptionKey: 'features.intercompanyDesc' },
      { key: 'operations.assets', labelKey: 'features.assets', descriptionKey: 'features.assetsDesc' },
    ],
  },
  {
    titleKey: 'features.group.compliance',
    items: [
      { key: 'compliance.tax', labelKey: 'features.tax', descriptionKey: 'features.taxDesc' },
      { key: 'compliance.treasury', labelKey: 'features.treasury', descriptionKey: 'features.treasuryDesc' },
      { key: 'compliance.legal', labelKey: 'features.legal', descriptionKey: 'features.legalDesc' },
    ],
  },
  {
    titleKey: 'features.group.advanced',
    items: [
      { key: 'advanced.workflow', labelKey: 'features.workflow', descriptionKey: 'features.workflowDesc' },
      { key: 'advanced.scenarios', labelKey: 'features.scenarios', descriptionKey: 'features.scenariosDesc' },
      { key: 'advanced.forecasts', labelKey: 'features.forecasts', descriptionKey: 'features.forecastsDesc' },
      { key: 'advanced.connectors', labelKey: 'features.connectors', descriptionKey: 'features.connectorsDesc' },
      { key: 'advanced.reconciliation', labelKey: 'features.reconciliation', descriptionKey: 'features.reconciliationDesc' },
      { key: 'advanced.leases', labelKey: 'features.leases', descriptionKey: 'features.leasesDesc' },
      { key: 'advanced.esg', labelKey: 'features.esg', descriptionKey: 'features.esgDesc' },
      { key: 'advanced.allocations', labelKey: 'features.allocations', descriptionKey: 'features.allocationsDesc' },
      { key: 'advanced.ai_forecast', labelKey: 'features.aiForecast', descriptionKey: 'features.aiForecastDesc' },
    ],
  },
  {
    titleKey: 'features.group.utilities',
    items: [
      { key: 'utility.export', labelKey: 'features.export', descriptionKey: 'features.exportDesc' },
      { key: 'utility.commentary', labelKey: 'features.commentary', descriptionKey: 'features.commentaryDesc' },
    ],
  },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        checked ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function FeaturesPage() {
  const { t } = useTranslation();
  const { features, toggleFeature } = useFeatureStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('features.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('features.subtitle')}
        </p>
      </div>

      {/* Feature Groups */}
      {FEATURE_GROUPS.map((group) => (
        <div key={group.titleKey} className="card overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t(group.titleKey)}
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {group.items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {t(item.labelKey)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t(item.descriptionKey)}
                  </p>
                </div>
                <ToggleSwitch
                  checked={features[item.key] ?? false}
                  onChange={() => toggleFeature(item.key)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
