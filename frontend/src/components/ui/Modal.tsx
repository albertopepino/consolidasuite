import { cn } from '@/utils/cn';

interface ModalProps { open: boolean; onClose: () => void; title?: string; className?: string; children: React.ReactNode; }

export function Modal({ open, onClose, title, className, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative w-full max-w-lg glass-card p-6 animate-scale-in', className)}>
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold font-display text-slate-900 dark:text-white">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100/60 hover:text-slate-600 dark:hover:bg-slate-700/40 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
