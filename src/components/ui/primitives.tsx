import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown, OctagonAlert, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/* --------------------------------- Card ---------------------------------- */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-4', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="h-9 w-9 shrink-0 rounded-xl bg-ink-100 text-ink-600 grid place-items-center">{icon}</div>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold leading-tight tracking-[-0.02em] text-ink-900 truncate">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-500 leading-snug">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* --------------------------------- Badge --------------------------------- */

export type BadgeTone =
  | 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'amber' | 'slate'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  slate: 'bg-ink-100 text-ink-600 ring-ink-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  info: 'bg-info-50 text-info-700 ring-info-100',
  violet: 'bg-plum-50 text-plum-700 ring-plum-100',
  amber: 'bg-brand-50 text-brand-800 ring-brand-100',
}

export function Badge({
  tone = 'neutral',
  className,
  dot,
  children,
}: {
  tone?: BadgeTone
  className?: string
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] ring-1 ring-inset whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/* --------------------------------- Input --------------------------------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  sizeVariant?: 'md' | 'lg'
  /**
   * Kelas untuk elemen <input> itu sendiri (mis. `tnum`).
   * `className` menempel pada pembungkus label+field, jadi utilitas tata letak
   * seperti `mt-4` memberi jarak pada seluruh grup, bukan menyelip di antara
   * label dan kotaknya.
   */
  inputClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, inputClassName, sizeVariant = 'md', id, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-white text-ink-900 placeholder:text-ink-400 transition-colors',
            'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 outline-none',
            sizeVariant === 'lg' ? 'h-13 py-3.5 text-base' : 'h-11 text-sm',
            leftIcon ? 'pl-10' : 'pl-3.5',
            rightSlot ? 'pr-24' : 'pr-3.5',
            error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : 'border-ink-300',
            props.disabled && 'bg-ink-50 text-ink-500 cursor-not-allowed',
            inputClassName,
          )}
          {...props}
        />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-danger-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
})

/** Input khusus nominal Rupiah — memformat ribuan saat mengetik. */
export const CurrencyInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'onChange' | 'value'> & { value: number; onValueChange: (value: number) => void }
>(function CurrencyInput({ value, onValueChange, inputClassName, ...props }, ref) {
  return (
    <Input
      ref={ref}
      inputMode="numeric"
      value={value ? new Intl.NumberFormat('id-ID').format(value) : ''}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '')
        onValueChange(digits ? parseInt(digits, 10) : 0)
      }}
      leftIcon={<span className="text-[13px] font-semibold text-ink-500">Rp</span>}
      inputClassName={cn('tnum font-semibold', inputClassName)}
      placeholder="0"
      {...props}
    />
  )
})

/* ------------------------------- Textarea -------------------------------- */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  /** Kelas untuk elemen <textarea>; `className` menempel pada pembungkusnya. */
  textareaClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, textareaClassName, id, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-ink-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400',
          'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 outline-none transition-colors resize-none',
          error ? 'border-danger-500' : 'border-ink-300',
          textareaClassName,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-danger-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
})

/* --------------------------------- Select -------------------------------- */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  options: { value: string; label: string }[]
  /** Kelas untuk elemen <select>; `className` menempel pada pembungkusnya. */
  selectClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, options, className, selectClassName, id, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border border-ink-300 bg-white pl-3.5 pr-10 text-sm text-ink-900',
            'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 outline-none transition-colors cursor-pointer',
            selectClassName,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
      {hint && <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>}
    </div>
  )
})

/* -------------------------------- Search --------------------------------- */

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchInput({ className, ...props }, ref) {
    return (
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
        <input
          ref={ref}
          type="search"
          className={cn(
            'h-11 w-full rounded-xl border border-ink-300 bg-white pl-11 pr-3.5 text-sm text-ink-900',
            'placeholder:text-ink-400 outline-none transition-colors',
            'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12',
            '[&::-webkit-search-cancel-button]:appearance-none',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)

/* -------------------------------- Switch --------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-ink-300',
        )}
      >
        {/*
          `left-0.5` wajib eksplisit. Tanpa itu posisi statik span absolut ini
          mengikuti `text-align: center` bawaan <button>, sehingga knob mulai di
          tengah track lalu translate mendorongnya keluar sama sekali.
        */}
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-ink-800">{label}</span>}
          {description && <span className="mt-0.5 block text-[13px] text-ink-500">{description}</span>}
        </span>
      )}
    </label>
  )
}

/* ------------------------------ Progress bar ----------------------------- */

export function ProgressBar({
  value,
  tone = 'brand',
  className,
}: {
  value: number
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const colors = {
    brand: 'bg-brand-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  }
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-150', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

/* ------------------------------ Empty state ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 text-ink-400">{icon}</div>
      )}
      <h3 className="font-display text-[15.5px] font-bold tracking-[-0.02em] text-ink-800">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-9', c === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------ Error state ------------------------------ */

export function ErrorState({
  title = 'Terjadi kesalahan',
  description = 'Data tidak dapat dimuat. Silakan coba lagi.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-danger-50 text-danger-500">
        <OctagonAlert className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="font-display text-[15.5px] font-bold tracking-[-0.02em] text-ink-800">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-ink-500">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
        >
          Muat ulang
        </button>
      )}
    </div>
  )
}

/* --------------------------------- Tabs ---------------------------------- */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-xl bg-ink-100 p-1 ring-1 ring-inset ring-ink-200/60', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150',
            size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]',
            value === o.value
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-700',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------- Tooltip -------------------------------- */

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-pop transition-opacity group-hover/tip:opacity-100">
        {label}
      </span>
    </span>
  )
}

/* ------------------------------- Data table ------------------------------ */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className, align = 'left' }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-ink-200 bg-ink-50 px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className, align = 'left' }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'border-b border-ink-100 px-4 py-3 text-ink-700 align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}

/* -------------------------------- Avatar --------------------------------- */

export function Avatar({
  name,
  gradient = 'from-ink-500 to-ink-700',
  size = 'md',
  className,
}: {
  name: string
  gradient?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-[13px]',
    lg: 'h-14 w-14 text-lg',
  }
  const label = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white',
        gradient,
        sizes[size],
        className,
      )}
    >
      {label}
    </div>
  )
}
