import { cn } from '@/utils/cn';

const VARIANTS = {
  green: 'pill-green', red: 'pill-red', blue: 'pill-blue',
  amber: 'pill-amber', violet: 'pill-violet', slate: 'pill-slate',
  // aliases
  positive: 'pill-green', negative: 'pill-red', info: 'pill-blue',
  warning: 'pill-amber', neutral: 'pill-slate',
};

interface BadgeProps { variant?: keyof typeof VARIANTS; size?: 'sm' | 'md'; className?: string; children: React.ReactNode; dot?: boolean; pulse?: boolean; }

export function Badge({ variant = 'neutral', size = 'md', className, children, dot, pulse }: BadgeProps) {
  return (
    <span className={cn(VARIANTS[variant], size === 'sm' && 'text-[10px] px-2 py-0.5', className)}>
      {dot && <span className={cn('dot', variant === 'green' || variant === 'positive' ? 'dot-green' : variant === 'red' || variant === 'negative' ? 'dot-red' : variant === 'amber' || variant === 'warning' ? 'dot-amber' : 'dot-blue', pulse && 'animate-pulse-soft')} />}
      {children}
    </span>
  );
}
