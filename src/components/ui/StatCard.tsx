import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn, formatPercent } from '@/lib/utils'
import { AnimatedNumber, StaggerItem } from './motion'

export type StatTone = 'brand' | 'info' | 'plum' | 'violet' | 'amber' | 'danger' | 'success' | 'warning' | 'neutral'

/**
 * Nada warna hanya menyentuh ikon. Kartu sengaja tidak lagi memakai garis
 * aksen di tepi atas — pola itu ciri khas templat dashboard.
 */
const TONES: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200/70',
  info: 'bg-info-50 text-info-600 ring-info-100',
  plum: 'bg-plum-50 text-plum-600 ring-plum-100',
  violet: 'bg-plum-50 text-plum-600 ring-plum-100',
  amber: 'bg-brand-50 text-brand-700 ring-brand-100',
  danger: 'bg-danger-50 text-danger-600 ring-danger-100',
  success: 'bg-success-50 text-success-600 ring-success-100',
  warning: 'bg-warning-50 text-warning-600 ring-warning-100',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  tone = 'brand',
  delta,
  deltaLabel,
  footer,
  loading,
  className,
  compact,
  /** Bila diisi, nominal dianimasikan merayap naik. */
  animateValue,
}: {
  label: string
  value: ReactNode
  sublabel?: ReactNode
  icon?: ReactNode
  tone?: StatTone
  delta?: number
  deltaLabel?: string
  footer?: ReactNode
  loading?: boolean
  className?: string
  compact?: boolean
  animateValue?: { amount: number; format?: 'idr' | 'plain' }
}) {
  if (loading) {
    return (
      <div className={cn('card p-5', className)}>
        <div className="skeleton h-3.5 w-24" />
        <div className="skeleton mt-3.5 h-8 w-36" />
        <div className="skeleton mt-3 h-3 w-20" />
      </div>
    )
  }

  const hasDelta = typeof delta === 'number' && Number.isFinite(delta)
  const positive = hasDelta && delta! > 0.05
  const negative = hasDelta && delta! < -0.05

  return (
    <StaggerItem
      className={cn(
        'card card-hover group relative overflow-hidden',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-500">{label}</p>
          <p
            className={cn(
              // Nominal Rupiah bisa sangat panjang — jaga tetap satu baris.
              'figure mt-2.5 whitespace-nowrap leading-none text-ink-900',
              compact ? 'text-[19px]' : 'text-[21px] 2xl:text-[24px]',
            )}
          >
            {animateValue ? (
              <AnimatedNumber value={animateValue.amount} format={animateValue.format ?? 'idr'} />
            ) : (
              value
            )}
          </p>
          {sublabel && <p className="mt-2 text-[12.5px] leading-snug text-ink-500">{sublabel}</p>}
        </div>
        {icon && (
          <span
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105',
              TONES[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      {(hasDelta || footer) && (
        <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3">
          {hasDelta && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11.5px] font-bold tnum',
                positive && 'bg-success-50 text-success-700',
                negative && 'bg-danger-50 text-danger-700',
                !positive && !negative && 'bg-ink-100 text-ink-600',
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : negative ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {formatPercent(Math.abs(delta!))}
            </span>
          )}
          {(deltaLabel || footer) && (
            <span className="truncate text-[11.5px] text-ink-500">{footer ?? deltaLabel}</span>
          )}
        </div>
      )}
    </StaggerItem>
  )
}

/** Baris statistik ringkas untuk panel samping / ringkasan. */
export function StatRow({
  label,
  value,
  tone,
  bold,
  className,
}: {
  label: ReactNode
  value: ReactNode
  tone?: 'default' | 'success' | 'danger' | 'muted'
  bold?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-1.5', className)}>
      <span
        className={cn(
          'text-[13px]',
          tone === 'muted' ? 'text-ink-400' : 'text-ink-600',
          bold && 'font-semibold text-ink-800',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-[13.5px] tnum font-semibold',
          tone === 'success' && 'text-success-600',
          tone === 'danger' && 'text-danger-600',
          tone === 'muted' && 'text-ink-400',
          (!tone || tone === 'default') && 'text-ink-900',
          bold && 'figure text-[15px]',
        )}
      >
        {value}
      </span>
    </div>
  )
}
