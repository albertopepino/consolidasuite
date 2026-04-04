import { cn } from '@/utils/cn';

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; label?: string; className?: string; }

export function LoadingSpinner({ size = 'md', label, className }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <svg className={cn(sizes[size], 'animate-spin text-brand-500')} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      {label && <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>}
    </div>
  );
}
