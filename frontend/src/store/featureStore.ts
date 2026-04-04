import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureState {
  features: Record<string, boolean>;
  isEnabled: (feature: string) => boolean;
  toggleFeature: (feature: string) => void;
  setFeature: (feature: string, enabled: boolean) => void;
}

const DEFAULT_FEATURES: Record<string, boolean> = {
  // Core (always on, but toggleable)
  'finance.statements': true,
  'finance.budget': true,
  'finance.targets': true,
  'finance.accounts': true,
  'finance.analytics': true,
  'finance.upload': true,
  // People
  'people.hr': true,
  // Operations
  'operations.intercompany': true,
  'operations.assets': true,
  // Compliance
  'compliance.tax': true,
  'compliance.treasury': true,
  'compliance.legal': true,
  // Advanced
  'advanced.workflow': true,
  'advanced.scenarios': true,
  'advanced.forecasts': true,
  'advanced.connectors': true,
  'advanced.reconciliation': true,
  'advanced.leases': true,
  'advanced.esg': true,
  'advanced.allocations': true,
  'advanced.ai_forecast': true,
  // Utilities
  'utility.export': true,
  'utility.commentary': true,
};

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      features: DEFAULT_FEATURES,
      isEnabled: (feature: string) => get().features[feature] ?? false,
      toggleFeature: (feature) => set((state) => ({
        features: { ...state.features, [feature]: !state.features[feature] },
      })),
      setFeature: (feature, enabled) => set((state) => ({
        features: { ...state.features, [feature]: enabled },
      })),
    }),
    { name: 'consolidasuite-features', version: 1 }
  )
);
