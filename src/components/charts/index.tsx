import type { ReactNode } from 'react'
import { ChartColumnBig } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn, formatCompactIDR, formatIDR, formatNumber } from '@/lib/utils'

/** Palet Warm Editorial: saffron memimpin, sisanya pendamping hangat & sejuk. */
export const CHART_COLORS = ['#E0921A', '#4A9366', '#4A5FA5', '#7C4D77', '#C2703A', '#2F7D7A', '#C0402B', '#8A7A34']

const axisStyle = { fontSize: 11, fill: '#9C9184', fontWeight: 500 }

/* ------------------------------- Tooltip --------------------------------- */

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = formatIDR,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  valueFormatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-pop">
      {label && <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color || entry.fill }} />
            <span className="text-[12px] text-ink-600">{entry.name}</span>
            <span className="ml-auto text-[13px] font-bold tnum text-ink-900">
              {valueFormatter(entry.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Chart shell ------------------------------ */

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  height = 280,
  className,
  empty,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  height?: number
  className?: string
  empty?: boolean
}) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-[15.5px] font-bold leading-tight tracking-[-0.02em] text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {empty ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl bg-ink-50 text-center"
          style={{ height }}
        >
          <ChartColumnBig className="h-8 w-8 text-ink-300" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold text-ink-600">Belum ada data</p>
          <p className="mt-1 text-[12px] text-ink-400">Data akan muncul setelah ada transaksi pada periode ini.</p>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  )
}

/* ------------------------------ Area / Line ------------------------------ */

export function RevenueAreaChart({
  data,
  dataKey = 'revenue',
  xKey = 'label',
  color = '#E0921A',
  valueFormatter = formatIDR,
  name = 'Pendapatan',
}: {
  data: any[]
  dataKey?: string
  xKey?: string
  color?: string
  valueFormatter?: (v: number) => string
  name?: string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#E9E3D9" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} tickMargin={10} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={68}
          tickFormatter={(v) => formatCompactIDR(v as number)}
        />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: '#C0B7AA', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ComparisonLineChart({
  data,
  series,
  xKey = 'label',
  valueFormatter = formatIDR,
}: {
  data: any[]
  series: { key: string; name: string; color: string; dashed?: boolean }[]
  xKey?: string
  valueFormatter?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#E9E3D9" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} tickMargin={10} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={68}
          tickFormatter={(v) => formatCompactIDR(v as number)}
        />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, fontWeight: 600, color: '#5C5147' }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            strokeDasharray={s.dashed ? '5 4' : undefined}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/* --------------------------------- Bar ----------------------------------- */

export function SimpleBarChart({
  data,
  dataKey = 'revenue',
  xKey = 'label',
  color = '#E0921A',
  valueFormatter = formatIDR,
  name = 'Pendapatan',
  layout = 'horizontal',
  colorful,
  axisFormatter = formatCompactIDR,
}: {
  data: any[]
  dataKey?: string
  xKey?: string
  color?: string
  valueFormatter?: (v: number) => string
  name?: string
  layout?: 'horizontal' | 'vertical'
  colorful?: boolean
  /** Format label sumbu nilai, ganti untuk data non-mata uang. */
  axisFormatter?: (v: number) => string
}) {
  const vertical = layout === 'vertical'
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={layout}
        margin={vertical ? { top: 4, right: 16, left: 8, bottom: 4 } : { top: 6, right: 8, left: -12, bottom: 0 }}
        barCategoryGap={vertical ? '28%' : '32%'}
      >
        <CartesianGrid strokeDasharray="4 4" stroke="#E9E3D9" vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => axisFormatter(v as number)} />
            <YAxis type="category" dataKey={xKey} tick={{ ...axisStyle, fontSize: 11.5 }} axisLine={false} tickLine={false} width={132} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={68} tickFormatter={(v) => axisFormatter(v as number)} />
          </>
        )}
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: 'rgba(156,145,132,.12)' }} />
        <Bar dataKey={dataKey} name={name} radius={vertical ? [0, 8, 8, 0] : [8, 8, 0, 0]} fill={color} maxBarSize={vertical ? 22 : 46}>
          {colorful && data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Varian batang untuk data kuantitas (bukan mata uang). */
export function CountBarChart(props: Omit<Parameters<typeof SimpleBarChart>[0], 'valueFormatter' | 'axisFormatter'>) {
  return (
    <SimpleBarChart
      {...props}
      valueFormatter={(v) => `${formatNumber(v)}×`}
      axisFormatter={(v) => formatNumber(v)}
    />
  )
}

/* -------------------------------- Donut ---------------------------------- */

export function DonutChart({
  data,
  nameKey = 'name',
  dataKey = 'value',
  colors = CHART_COLORS,
  centerLabel,
  centerValue,
  valueFormatter = formatIDR,
}: {
  data: any[]
  nameKey?: string
  dataKey?: string
  colors?: string[]
  centerLabel?: string
  centerValue?: string
  valueFormatter?: (v: number) => string
}) {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            nameKey={nameKey}
            dataKey={dataKey}
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <p className="figure text-[20px] leading-none text-ink-900">{centerValue}</p>}
          {centerLabel && <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{centerLabel}</p>}
        </div>
      )}
    </div>
  )
}

/** Legenda donut yang bisa dipakai berdampingan dengan chart. */
export function DonutLegend({
  data,
  colors = CHART_COLORS,
  valueFormatter = formatIDR,
}: {
  data: { name: string; value: number; percent?: number; color?: string; count?: number }[]
  colors?: string[]
  valueFormatter?: (v: number) => string
}) {
  return (
    <ul className="space-y-2.5">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color ?? colors[i % colors.length] }} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-600">{d.name}</span>
          <span className="text-[13px] font-bold tnum text-ink-900">{valueFormatter(d.value)}</span>
          {typeof d.percent === 'number' && (
            <span className="w-12 text-right text-[12px] font-semibold tnum text-ink-400">
              {d.percent.toFixed(1).replace('.', ',')}%
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
