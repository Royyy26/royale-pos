import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'danger-soft'
  | 'success'
  | 'dark'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm'

/**
 * Aksi utama memakai espresso pekat, bukan warna aksen, saffron disimpan
 * untuk sorotan agar tidak kehilangan daya tariknya.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-ink-900 text-ink-50 shadow-sm hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-400',
  accent:
    'bg-brand-500 text-ink-950 shadow-sm hover:bg-brand-400 active:bg-brand-600 disabled:bg-brand-200',
  secondary: 'bg-ink-100 text-ink-800 hover:bg-ink-150 active:bg-ink-200 disabled:text-ink-400',
  outline:
    'bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 active:bg-ink-150',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-500 active:bg-danger-700',
  'danger-soft': 'bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-100',
  success: 'bg-success-600 text-white shadow-sm hover:bg-success-500',
  dark: 'bg-ink-900 text-ink-50 shadow-sm hover:bg-ink-800 active:bg-ink-950',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  xl: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group/btn relative inline-flex items-center justify-center overflow-hidden font-semibold',
        'transition-[background-color,border-color,color,transform,box-shadow] duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60 select-none',
        'active:scale-[.98]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {/* Sorot melintas tipis saat hover, hanya pada tombol berisi. */}
      {(variant === 'primary' || variant === 'dark' || variant === 'accent') && !disabled && !loading && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-500 group-hover/btn:translate-x-full" />
      )}
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
