import { CalendarDays } from 'lucide-react'
import { cn, formatDateShort } from '@/lib/utils'
import { RANGE_OPTIONS, type DateRange, type RangePreset } from '@/lib/analytics'

export function RangeFilter({
  preset,
  onPresetChange,
  from,
  to,
  onFromChange,
  onToChange,
  range,
  className,
}: {
  preset: RangePreset
  onPresetChange: (preset: RangePreset) => void
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  range: DateRange
  className?: string
}) {
  return (
    <div className={cn('card p-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-2 text-[13px] font-bold text-ink-700">
          <CalendarDays className="h-4 w-4 text-ink-400" />
          Periode
        </span>

        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onPresetChange(o.value)}
            className={cn(
              'rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors',
              preset === o.value ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
            )}
          >
            {o.label}
          </button>
        ))}

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="h-10 rounded-xl border border-ink-300 px-3 text-[13px] text-ink-800 outline-none focus:border-brand-500"
            />
            <span className="text-ink-400">s/d</span>
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="h-10 rounded-xl border border-ink-300 px-3 text-[13px] text-ink-800 outline-none focus:border-brand-500"
            />
          </div>
        )}

        <span className="ml-auto rounded-xl bg-brand-50 px-3 py-2 text-[12.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
          {formatDateShort(range.from)} s/d {formatDateShort(range.to)}
        </span>
      </div>
    </div>
  )
}
