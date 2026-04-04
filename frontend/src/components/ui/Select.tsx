import { cn } from '@/utils/cn';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string; label?: string; error?: string;
}

export function Select({ className, options, placeholder, label, error, id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <select id={id} className={cn('input appearance-none pr-10 bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27%236b7280%27 d=%27M2.22 4.47a.75.75 0 0 1 1.06 0L6 7.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L2.22 5.53a.75.75 0 0 1 0-1.06z%27/%3E%3C/svg%3E")] bg-[position:right_0.75rem_center] bg-no-repeat', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10', className)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
