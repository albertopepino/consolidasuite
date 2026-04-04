import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';
import type { KPICardData } from '@/types/kpi';

interface KPICardProps {
  data: KPICardData;
  className?: string;
  index?: number;
}

const COLOR_MAP: Record<string, {
  bg: string;
  icon: string;
  accent: string;
  glow: string;
  ring: string;
}> = {
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-500',    accent: 'from-blue-500 to-blue-600',    glow: 'shadow-blue-500/20',    ring: 'ring-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', accent: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20', ring: 'ring-emerald-500/20' },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-500',  accent: 'from-violet-500 to-violet-600',  glow: 'shadow-violet-500/20',  ring: 'ring-violet-500/20' },
  pink:    { bg: 'bg-pink-500/10',    icon: 'text-pink-500',    accent: 'from-pink-500 to-pink-600',    glow: 'shadow-pink-500/20',    ring: 'ring-pink-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',    icon: 'text-cyan-500',    accent: 'from-cyan-500 to-cyan-600',    glow: 'shadow-cyan-500/20',    ring: 'ring-cyan-500/20' },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-500',   accent: 'from-amber-500 to-amber-600',   glow: 'shadow-amber-500/20',   ring: 'ring-amber-500/20' },
};

export function KPICard({ data, className, index = 0 }: KPICardProps) {
  const { t } = useTranslation();
  const { label, formattedValue, benchmark, icon, color } = data;
  const colors = COLOR_MAP[color || 'blue'] || COLOR_MAP.blue;

  return (
    <div
      className={cn(
        'group relative overflow-hidden glass-card p-5',
        'transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-card-hover',
        'opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]',
        className
      )}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Left accent bar */}
      <div className={cn(
        'absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b',
        colors.accent
      )} />

      {/* Subtle decorative glow in corner */}
      <div className={cn(
        'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-50',
        colors.bg
      )} />

      <div className="relative flex items-start gap-4 pl-2">
        {/* Icon in colored circle */}
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
          colors.bg,
          colors.ring,
          'transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg',
          colors.glow,
        )}>
          <KPIIcon type={icon || 'ratio'} className={cn('h-5 w-5', colors.icon)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            {formattedValue}
          </p>
        </div>
      </div>

      {/* Bottom info */}
      {benchmark !== undefined && (
        <div className="relative mt-3 ml-2 flex items-center gap-2 border-t border-slate-100/60 pt-3 dark:border-slate-700/30">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {t('kpi.benchmark')}: {benchmark.toFixed(1)}
          </span>
          {data.value > benchmark === data.isPositiveGood ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {t('kpi.aboveTarget')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              {t('kpi.belowTarget')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function KPIIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn('transition-transform duration-200', className);
  switch (type) {
    case 'revenue':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'profit':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case 'expense':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      );
    case 'cash':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'growth':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case 'ratio':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
  }
}
