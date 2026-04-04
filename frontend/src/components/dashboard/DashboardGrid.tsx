import { useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useDashboardStore } from '@/store/dashboardStore';
import { useMultiMonthKPIs, useConsolidatedMultiMonthKPIs } from '@/api/hooks';
import { FinancialLineChart } from '@/components/charts/LineChart';
import { FinancialBarChart } from '@/components/charts/BarChart';
import { ComboChart } from '@/components/charts/ComboChart';
import { StackedBarChart } from '@/components/charts/StackedBarChart';
import type { KPIResponse } from '@/types/kpi';

const MONTHS = [7, 8, 9, 10, 11, 12];
const MONTH_LABELS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function findKPI(kpis: KPIResponse, category: string, name: string): number {
  const cats = kpis[category as keyof Pick<KPIResponse, 'profitability' | 'liquidity' | 'efficiency' | 'leverage'>];
  if (!Array.isArray(cats)) return 0;
  const item = cats.find((k) => k.name === name);
  if (!item || item.value === null) return 0;
  return parseFloat(item.value);
}

function ChartCard({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/30 dark:border-slate-700/20">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">{title}</h3>
          {subtitle && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function DashboardGrid() {
  const { t } = useTranslation();
  const selectedSiteId = useDashboardStore((s) => s.selectedSiteId);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const visibleWidgets = useDashboardStore((s) => s.visibleWidgets);

  const { data: siteMonthly, isLoading: siteLoading } = useMultiMonthKPIs(
    selectedSiteId || '', selectedYear, MONTHS
  );
  const { data: consolidatedMonthly, isLoading: consLoading } = useConsolidatedMultiMonthKPIs(
    selectedYear, MONTHS
  );

  const monthly = selectedSiteId ? siteMonthly : consolidatedMonthly;
  const isLoading = selectedSiteId ? siteLoading : consLoading;

  const chartData = useMemo(() => {
    if (!monthly || monthly.length === 0) return null;

    const revenueTrend = monthly.map((m, i) => ({
      name: MONTH_LABELS[i],
      value: findKPI(m.kpis, 'profitability', 'Revenue'),
    }));

    const profitability = monthly.map((m, i) => ({
      name: MONTH_LABELS[i],
      grossMargin: findKPI(m.kpis, 'profitability', 'Gross Margin') * 100,
      opMargin: findKPI(m.kpis, 'profitability', 'Operating Margin') * 100,
      netMargin: findKPI(m.kpis, 'profitability', 'Net Profit Margin') * 100,
    }));

    const workingCapital = monthly.map((m, i) => ({
      name: MONTH_LABELS[i],
      value: findKPI(m.kpis, 'liquidity', 'Working Capital'),
    }));

    const arAp = monthly.map((m, i) => ({
      name: MONTH_LABELS[i],
      ar: findKPI(m.kpis, 'efficiency', 'AR Turnover'),
      ap: findKPI(m.kpis, 'efficiency', 'AP Turnover'),
    }));

    const cashFlow = monthly.map((m, i) => ({
      name: MONTH_LABELS[i],
      value: findKPI(m.kpis, 'liquidity', 'Cash & Bank'),
    }));

    const expenseBreakdown = monthly.map((m, i) => {
      const revenue = findKPI(m.kpis, 'profitability', 'Revenue');
      const gp = revenue * findKPI(m.kpis, 'profitability', 'Gross Margin');
      const ebit = findKPI(m.kpis, 'profitability', 'EBITDA');
      const cogs = revenue - gp;
      const opex = gp - ebit;
      return { name: MONTH_LABELS[i], cogs: Math.abs(cogs), opex: Math.abs(opex), ebitda: ebit };
    });

    return { revenueTrend, profitability, workingCapital, arAp, cashFlow, expenseBreakdown };
  }, [monthly]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[340px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="glass-card flex h-48 items-center justify-center">
        <p className="text-sm text-slate-400">No chart data available for this period</p>
      </div>
    );
  }

  const show = (id: string) => visibleWidgets.includes(id);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 stagger-children">
      {show('revenue-trend') && (
        <ChartCard title={t('chart.revenueTrend')} subtitle={t('chart.last6months')}>
          <FinancialLineChart data={chartData.revenueTrend} dataKey="value" xAxisKey="name" color="#3b82f6" />
        </ChartCard>
      )}

      {show('profitability') && (
        <ChartCard title={t('chart.profitabilityMargins')} subtitle="%">
          <FinancialLineChart
            data={chartData.profitability} dataKey="grossMargin" xAxisKey="name" color="#10b981"
            isCurrency={false} showLegend
            additionalLines={[
              { dataKey: 'opMargin', name: 'Operating', color: '#3b82f6', dashed: false },
              { dataKey: 'netMargin', name: 'Net', color: '#8b5cf6', dashed: true },
            ]}
          />
        </ChartCard>
      )}

      {show('working-capital') && (
        <ChartCard title={t('chart.workingCapital')} subtitle={t('chart.last6months')}>
          <FinancialLineChart data={chartData.workingCapital} dataKey="value" xAxisKey="name" color="#8b5cf6" />
        </ChartCard>
      )}

      {show('ar-ap') && (
        <ChartCard title={t('chart.arApTurnover')} subtitle="Ratio">
          <ComboChart
            data={chartData.arAp} barKey="ar" barName="AR Turnover" barColor="#3b82f6"
            lineKey="ap" lineName="AP Turnover" lineColor="#ef4444" xAxisKey="name"
          />
        </ChartCard>
      )}

      {show('cash-flow') && (
        <ChartCard title={t('chart.cashBalance')} subtitle={t('chart.last6months')}>
          <FinancialBarChart
            data={chartData.cashFlow} bars={[{ dataKey: 'value', name: 'Cash & Bank', color: '#10b981' }]} xAxisKey="name"
          />
        </ChartCard>
      )}

      {show('expense-breakdown') && (
        <ChartCard title={t('chart.revenueComposition')} subtitle="COGS / OpEx / EBITDA" className="lg:col-span-2">
          <StackedBarChart
            data={chartData.expenseBreakdown}
            bars={[
              { dataKey: 'cogs', name: 'COGS', color: '#ef4444' },
              { dataKey: 'opex', name: 'OpEx', color: '#f59e0b' },
              { dataKey: 'ebitda', name: 'EBITDA', color: '#10b981' },
            ]}
            xAxisKey="name"
          />
        </ChartCard>
      )}
    </div>
  );
}
