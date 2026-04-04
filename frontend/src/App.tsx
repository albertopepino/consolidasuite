import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useFeatureStore } from '@/store/featureStore';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UploadPage } from '@/pages/UploadPage';
import { BudgetPage } from '@/pages/BudgetPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { FinancialStatementsPage } from '@/pages/FinancialStatementsPage';
import { TargetsPage } from '@/pages/TargetsPage';
import { ChartOfAccountsPage } from '@/pages/ChartOfAccountsPage';
import { HRPage } from '@/pages/HRPage';
import { IntercompanyPage } from '@/pages/IntercompanyPage';
import { AssetsPage } from '@/pages/AssetsPage';
import { TaxPage } from '@/pages/TaxPage';
import { TreasuryPage } from '@/pages/TreasuryPage';
import { LegalPage } from '@/pages/LegalPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { FeaturesPage } from '@/pages/FeaturesPage';
import { WorkflowPage } from '@/pages/WorkflowPage';
import { ScenariosPage } from '@/pages/ScenariosPage';
import { ForecastsPage } from '@/pages/ForecastsPage';
import { ConnectorsPage } from '@/pages/ConnectorsPage';
import { ReconciliationPage } from '@/pages/ReconciliationPage';
import { LeasesPage } from '@/pages/LeasesPage';
import { ESGPage } from '@/pages/ESGPage';
import { AllocationsPage } from '@/pages/AllocationsPage';

export default function App() {
  const isEnabled = useFeatureStore((s) => s.isEnabled);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes inside the AppShell layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        {isEnabled('finance.statements') && <Route path="/statements" element={<FinancialStatementsPage />} />}
        {isEnabled('finance.accounts') && <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />}
        {isEnabled('finance.targets') && <Route path="/targets" element={<TargetsPage />} />}
        {isEnabled('finance.upload') && (
          <Route
            path="/upload"
            element={
              <ProtectedRoute allowedRoles={['admin', 'group_cfo', 'local_cfo']}>
                <UploadPage />
              </ProtectedRoute>
            }
          />
        )}
        {isEnabled('finance.budget') && (
          <Route
            path="/budget"
            element={
              <ProtectedRoute allowedRoles={['admin', 'group_cfo', 'local_cfo']}>
                <BudgetPage />
              </ProtectedRoute>
            }
          />
        )}
        {isEnabled('finance.analytics') && <Route path="/analytics" element={<AnalyticsPage />} />}
        {isEnabled('people.hr') && <Route path="/hr" element={<HRPage />} />}
        {isEnabled('operations.intercompany') && <Route path="/intercompany" element={<IntercompanyPage />} />}
        {isEnabled('operations.assets') && <Route path="/assets" element={<AssetsPage />} />}
        {isEnabled('compliance.tax') && <Route path="/tax" element={<TaxPage />} />}
        {isEnabled('compliance.treasury') && <Route path="/treasury" element={<TreasuryPage />} />}
        {isEnabled('compliance.legal') && <Route path="/legal" element={<LegalPage />} />}
        {isEnabled('advanced.workflow') && <Route path="/workflow" element={<WorkflowPage />} />}
        {isEnabled('advanced.scenarios') && <Route path="/scenarios" element={<ScenariosPage />} />}
        {isEnabled('advanced.forecasts') && <Route path="/forecasts" element={<ForecastsPage />} />}
        {isEnabled('advanced.connectors') && <Route path="/connectors" element={<ConnectorsPage />} />}
        {isEnabled('advanced.reconciliation') && <Route path="/reconciliation" element={<ReconciliationPage />} />}
        {isEnabled('advanced.leases') && <Route path="/leases" element={<LeasesPage />} />}
        {isEnabled('advanced.esg') && <Route path="/esg" element={<ESGPage />} />}
        {isEnabled('advanced.allocations') && <Route path="/allocations" element={<AllocationsPage />} />}
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
