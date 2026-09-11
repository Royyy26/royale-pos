import { useMemo, useState } from 'react'
import {
  Banknote,
  CalendarRange,
  ChevronDown,
  CreditCard,
  Download,
  Landmark,
  QrCode,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ProgressBar } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { RangeFilter } from '@/components/ui/RangeFilter'
import { cn, formatDateFull, formatIDR, formatNumber, formatTime, toInputDate } from '@/lib/utils'
import { dailyRecap, filterOrders, resolveRange, summarize, type RangePreset } from '@/lib/analytics'
import { OrderStatusBadge, PAYMENT_COLOR, PAYMENT_LABEL, PaymentBadge } from '@/lib/labels'
import { dailyTargetProgress } from '@/lib/targets'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Order, PaymentMethodCode } from '@/types'
import { OrderDetailDrawer } from '../orders/OrderDetailDrawer'

const METHOD_ICON: Record<PaymentMethodCode, typeof Banknote> = {
  cash: Banknote,
  qris: QrCode,
  transfer: Landmark,
  card: CreditCard,
}

/**
 * Rekap penjualan harian, pengganti penutupan shift. Setiap hari dirangkum
 * menjadi satu baris: total penjualan, jumlah transaksi, dan rincian per
 * metode pembayaran, tanpa perlu menghitung modal awal kas.
 */
export function DailyRecapPage() {
  const db = useDataStore((s) => s.db)
  const has = useAuthStore((s) => s.has)
  const canSeeFull = has('report.view.full')

  const [preset, setPreset] = useState<RangePreset>(canSeeFull ? 'last_30' : 'today')
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()))
  const [customTo, setCustomTo] = useState(toInputDate(new Date()))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Order | null>(null)

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo])
  const orders = useMemo(() => filterOrders(db.orders, range), [db.orders, range])
  const summary = useMemo(() => summarize(orders), [orders])
  const rows = useMemo(() => dailyRecap(orders, db.payments), [orders, db.payments])
  const dailyTarget = useMemo(() => dailyTargetProgress(db.orders, db.targets), [db.orders, db.targets])

  const bestDay = rows.reduce<(typeof rows)[number] | null>((best, r) => (!best || r.revenue > best.revenue ? r : best), null)
  const averagePerDay = rows.length ? summary.revenue / rows.length : 0

  const exportCsv = () => {
    const header = [
      'Tanggal', 'Transaksi', 'Item', 'Penjualan Kotor', 'Diskon', 'Service', 'Pajak',
      'Total Penjualan', 'Tunai', 'QRIS', 'Transfer', 'Kartu', 'Refund', 'Void', 'Estimasi Laba',
    ]
    const lines = rows.map((r) =>
      [
        toInputDate(r.date), r.transactions, r.itemsSold, r.grossSales, r.discountTotal, r.serviceTotal,
        r.taxTotal, r.revenue, r.byMethod.cash.amount, r.byMethod.qris.amount, r.byMethod.transfer.amount,
        r.byMethod.card.amount, r.refundTotal, r.voidTotal, r.estimatedProfit,
      ].join(';'),
    )
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rekap-harian-${toInputDate(range.from)}-${toInputDate(range.to)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rekap harian diekspor', `${rows.length} hari tersimpan sebagai CSV.`)
  }

  return (
    <Page
      title="Rekap Penjualan Harian"
      subtitle={`${rows.length} hari · ${range.label}`}
      actions={
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={rows.length === 0}>
          Ekspor CSV
        </Button>
      }
    >
      <RangeFilter
        className="mb-5"
        preset={preset}
        onPresetChange={setPreset}
        from={customFrom}
        to={customTo}
        onFromChange={setCustomFrom}
        onToChange={setCustomTo}
        range={range}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Penjualan"
          value={formatIDR(summary.revenue)}
          sublabel={`${formatNumber(summary.transactions)} transaksi`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Rata-rata per Hari"
          value={formatIDR(averagePerDay)}
          sublabel={`Dari ${rows.length} hari operasional`}
          icon={<CalendarRange className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Hari Terbaik"
          value={bestDay ? formatIDR(bestDay.revenue) : '-'}
          sublabel={bestDay ? formatDateFull(bestDay.date) : 'Belum ada data'}
          icon={<Receipt className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="Target Hari Ini"
          value={dailyTarget.hasTarget ? formatIDR(dailyTarget.target) : 'Belum diatur'}
          sublabel={
            dailyTarget.hasTarget
              ? `Tercapai ${formatIDR(dailyTarget.actual)} (${dailyTarget.percent.toFixed(0)}%)`
              : 'Owner belum menetapkan target bulanan'
          }
          icon={<TrendingUp className="h-5 w-5" />}
          tone={!dailyTarget.hasTarget ? 'neutral' : dailyTarget.percent >= 100 ? 'success' : 'warning'}
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarRange className="h-7 w-7" />}
            title="Belum ada penjualan"
            description="Tidak ada transaksi pada periode yang dipilih. Coba ubah rentang tanggalnya."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isOpen = expanded === row.key
            const methods: PaymentMethodCode[] = ['cash', 'qris', 'transfer', 'card']
            const maxMethod = Math.max(1, ...methods.map((m) => row.byMethod[m].amount))

            return (
              <Card key={row.key} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : row.key)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-50/60"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink-100">
                    <span className="text-[17px] figure leading-none text-ink-700">{row.date.getDate()}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink-900">{formatDateFull(row.date)}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {row.transactions} transaksi · {row.itemsSold} porsi · rata-rata {formatIDR(row.averageOrderValue)}
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 lg:flex">
                    {row.refundCount > 0 && <Badge tone="violet">{row.refundCount} refund</Badge>}
                    {row.voidCount > 0 && <Badge tone="danger">{row.voidCount} void</Badge>}
                    {row.discountTotal > 0 && <Badge tone="amber">Diskon {formatIDR(row.discountTotal)}</Badge>}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[19px] figure leading-none text-ink-900">{formatIDR(row.revenue)}</p>
                    <p className="mt-1 text-[11.5px] text-ink-400">Laba est. {formatIDR(row.estimatedProfit)}</p>
                  </div>

                  <ChevronDown
                    className={cn('h-5 w-5 shrink-0 text-ink-400 transition-transform', isOpen && 'rotate-180')}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-5 animate-slide-up">
                    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                      {/* Rincian metode & nominal */}
                      <div>
                        <p className="section-title mb-3">Rincian Metode Pembayaran</p>
                        <ul className="space-y-2.5">
                          {methods.map((m) => {
                            const Icon = METHOD_ICON[m]
                            const cell = row.byMethod[m]
                            return (
                              <li key={m}>
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                                    style={{ background: PAYMENT_COLOR[m] }}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="flex-1 text-[12.5px] font-medium text-ink-600">{PAYMENT_LABEL[m]}</span>
                                  <span className="text-[13px] font-bold tnum text-ink-900">{formatIDR(cell.amount)}</span>
                                  <span className="w-10 text-right text-[11.5px] tnum text-ink-400">{cell.count}×</span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${(cell.amount / maxMethod) * 100}%`, background: PAYMENT_COLOR[m] }}
                                  />
                                </div>
                              </li>
                            )
                          })}
                        </ul>

                        <p className="section-title mb-2 mt-5">Rekapitulasi Nilai</p>
                        <div className="rounded-xl border border-ink-200 bg-white px-4 py-1">
                          {[
                            { label: 'Penjualan kotor', value: formatIDR(row.grossSales) },
                            { label: 'Diskon', value: `-${formatIDR(row.discountTotal)}`, danger: row.discountTotal > 0 },
                            { label: 'Service charge', value: formatIDR(row.serviceTotal) },
                            { label: 'Pajak (PPN)', value: formatIDR(row.taxTotal) },
                            { label: 'Refund', value: `-${formatIDR(row.refundTotal)}`, danger: row.refundTotal > 0 },
                          ].map((line) => (
                            <div key={line.label} className="flex items-center justify-between border-b border-ink-100 py-2 last:border-0">
                              <span className="text-[12.5px] text-ink-600">{line.label}</span>
                              <span className={cn('text-[13px] font-semibold tnum', line.danger ? 'text-danger-600' : 'text-ink-800')}>
                                {line.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3 text-white">
                          <span className="text-[12.5px] font-semibold text-white/70">Total Penjualan Hari Ini</span>
                          <span className="text-[17px] figure">{formatIDR(row.revenue)}</span>
                        </div>
                      </div>

                      {/* Daftar transaksi hari itu */}
                      <div>
                        <p className="section-title mb-3">Transaksi ({row.orders.length})</p>
                        <div className="max-h-[380px] overflow-y-auto rounded-xl border border-ink-200 bg-white">
                          <ul className="divide-y divide-ink-100">
                            {row.orders.map((o) => {
                              const p = db.payments.find((x) => x.order_id === o.id)
                              return (
                                <li key={o.id}>
                                  <button
                                    onClick={() => setSelected(o)}
                                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-ink-50"
                                  >
                                    <span className="w-11 shrink-0 text-[12px] font-bold tnum text-ink-400">
                                      {formatTime(o.created_at)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[12.5px] font-bold text-ink-900">
                                        {o.order_number}
                                      </span>
                                      <span className="block truncate text-[11.5px] text-ink-500">
                                        {o.items.length} jenis · {o.items.reduce((a, i) => a + i.quantity, 0)} porsi
                                        {o.table_name ? ` · ${o.table_name}` : ''}
                                      </span>
                                    </span>
                                    {p && <PaymentBadge method={p.method} />}
                                    {o.status !== 'completed' && <OrderStatusBadge status={o.status} />}
                                    <span
                                      className={cn(
                                        'w-24 shrink-0 text-right text-[13px] figure',
                                        o.status === 'cancelled' ? 'text-ink-400 line-through' : 'text-ink-900',
                                      )}
                                    >
                                      {formatIDR(o.total)}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <OrderDetailDrawer order={selected} onClose={() => setSelected(null)} />
    </Page>
  )
}

/** Kartu progres target harian, dipakai pada dashboard kasir. */
export function DailyTargetCard() {
  const db = useDataStore((s) => s.db)
  const progress = useMemo(() => dailyTargetProgress(db.orders, db.targets), [db.orders, db.targets])

  if (!progress.hasTarget) {
    return (
      <Card className="p-5">
        <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Target Harian</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Owner belum menetapkan target bulanan, sehingga target harian belum tersedia.
        </p>
      </Card>
    )
  }

  const reached = progress.percent >= 100

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Target Penjualan Hari Ini</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Bagian harian dari target bulanan</p>
        </div>
        <Badge tone={reached ? 'success' : progress.percent >= 60 ? 'brand' : 'warning'} dot>
          {reached ? 'Tercapai' : `${progress.percent.toFixed(0)}%`}
        </Badge>
      </div>

      <p className="mt-4 text-[28px] font-extrabold leading-none tnum text-ink-900">{formatIDR(progress.actual)}</p>
      <p className="mt-1.5 text-[13px] text-ink-500">dari target {formatIDR(progress.target)}</p>

      <ProgressBar
        value={progress.percent}
        tone={reached ? 'success' : progress.percent >= 60 ? 'brand' : 'warning'}
        className="mt-4"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-ink-100 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Sisa Target</p>
          <p className="mt-0.5 text-[16px] figure text-ink-900">{formatIDR(progress.remaining)}</p>
        </div>
        <div className="rounded-xl bg-ink-100 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Transaksi</p>
          <p className="mt-0.5 text-[16px] figure text-ink-900">
            {progress.transactionActual}
            <span className="text-[12px] font-semibold text-ink-400"> / {Math.ceil(progress.transactionTarget)}</span>
          </p>
        </div>
      </div>
    </Card>
  )
}
