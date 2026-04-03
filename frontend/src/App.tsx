import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
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

export default function App() {
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
        <Route path="/statements" element={<FinancialStatementsPage />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
        <Route path="/targets" element={<TargetsPage />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute allowedRoles={['admin', 'group_cfo', 'local_cfo']}>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budget"
          element={
            <ProtectedRoute allowedRoles={['admin', 'group_cfo', 'local_cfo']}>
              <BudgetPage />
            </ProtectedRoute>
          }
        />
        <Route path="/hr" element={<HRPage />} />
        <Route path="/intercompany" element={<IntercompanyPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/tax" element={<TaxPage />} />
        <Route path="/treasury" element={<TreasuryPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
