/**
 * Conditional formatting utilities for financial data cells.
 * Returns Tailwind CSS class strings based on value thresholds.
 */

/**
 * Format a variance value (actual vs budget or period-over-period change).
 * Returns CSS classes for color-coding based on whether positive variance is favorable.
 *
 * @param value - The variance as a decimal (e.g., 0.10 = 10%)
 * @param isPositiveGood - Whether a positive variance is favorable (default: true)
 */
export function formatVariance(value: number, isPositiveGood: boolean = true): string {
  if (value > 0.05) return isPositiveGood ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';
  if (value < -0.05) return isPositiveGood ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50';
  return 'text-slate-600';
}

/**
 * Format a percentage cell with graduated color intensity.
 *
 * @param pct - The percentage as a decimal (e.g., 0.25 = 25%)
 */
export function formatPercentageCell(pct: number): string {
  if (pct >= 0.5) return 'text-emerald-700 bg-emerald-50 font-semibold';
  if (pct >= 0.2) return 'text-emerald-600';
  if (pct >= 0) return 'text-slate-700';
  if (pct >= -0.1) return 'text-amber-600';
  return 'text-red-600 bg-red-50 font-semibold';
}

/**
 * Format a ratio value against a target, with conditional emphasis.
 *
 * @param value - The actual ratio value
 * @param target - The target ratio value
 * @param higherIsBetter - Whether higher values are favorable (default: true)
 */
export function formatRatioVsTarget(value: number, target: number, higherIsBetter: boolean = true): string {
  const diff = value - target;
  const pctDiff = target !== 0 ? diff / target : 0;

  if (higherIsBetter) {
    if (pctDiff >= 0.1) return 'text-emerald-600 bg-emerald-50 font-semibold';
    if (pctDiff >= 0) return 'text-emerald-600';
    if (pctDiff >= -0.1) return 'text-amber-600';
    return 'text-red-600 bg-red-50 font-semibold';
  } else {
    if (pctDiff <= -0.1) return 'text-emerald-600 bg-emerald-50 font-semibold';
    if (pctDiff <= 0) return 'text-emerald-600';
    if (pctDiff <= 0.1) return 'text-amber-600';
    return 'text-red-600 bg-red-50 font-semibold';
  }
}

/**
 * Get a CSS class for a variance badge pill.
 */
export function varianceBadgeClass(variancePct: number | null): string {
  if (variancePct === null) return 'pill-slate';
  if (variancePct > 0.05) return 'pill-green';
  if (variancePct < -0.05) return 'pill-red';
  return 'pill-slate';
}
