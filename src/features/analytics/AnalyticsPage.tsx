import { useMemo, useState } from 'react'
import {
  Boxes,
  Coins,
  Download,
  PackageX,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Avatar, Badge, Card, EmptyState, ProgressBar, SegmentedControl, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { RangeFilter } from '@/components/ui/RangeFilter'
import { ChartCard, ComparisonLineChart, CountBarChart, DonutChart, DonutLegend, RevenueAreaChart, SimpleBarChart } from '@/components/charts'
import { cn, formatCompactIDR, formatIDR, formatNumber, formatPercent, toInputDate } from '@/lib/utils'
import {
  cashierPerformance,
  categoryPerformance,
  compareSummary,
  dailySeries,
  filterOrders,
  hourlySeries,
  monthlySeries,
  movementClassification,
  paymentBreakdown,
  previousRange,
  productPerformance,
  resolveRange,
  stockOverview,
  summarize,
  weeklySeries,
  type RangePreset,
} from '@/lib/analytics'
import { PAYMENT_COLOR, PAYMENT_LABEL, stockStatusOf } from '@/lib/labels'
import { TARGET_STATUS_LABEL, periodKey, targetHistory, targetProgress } from '@/lib/targets'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

type Granularity = 'hour' | 'day' | 'week' | 'month'

const TARGET_STATUS_BADGE = {
  upcoming: 'neutral',
  achieved: 'success',
  on_track: 'brand',
  at_risk: 'warning',
  behind: 'danger',
  missed: 'danger',
} as const

export function AnalyticsPage() {
  const db = useDataStore((s) => s.db)

  const [preset, setPreset] = useState<RangePreset>('last_30')
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()))
  const [customTo, setCustomTo] = useState(toInputDate(new Date()))
  const [granularity, setGranularity] = useState<Granularity>('day')

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo])
  const prev = useMemo(() => previousRange(range), [range])

  const orders = useMemo(() => filterOrders(db.orders, range), [db.orders, range])
  const prevOrders = useMemo(() => filterOrders(db.orders, prev), [db.orders, prev])

  const summary = useMemo(() => summarize(orders), [orders])
  const prevSummary = useMemo(() => summarize(prevOrders), [prevOrders])
  const delta = useMemo(() => compareSummary(summary, prevSummary), [summary, prevSummary])

  const days = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000))

  const series = useMemo(() => {
    if (granularity === 'hour') return hourlySeries(orders)
    if (granularity === 'week') return weeklySeries(db.orders, 10)
    if (granularity === 'month') return monthlySeries(db.orders, 8)
    return dailySeries(orders, range)
  }, [granularity, orders, range, db.orders])

  const comparison = useMemo(() => {
    const current = dailySeries(orders, range)
    const previous = dailySeries(prevOrders, prev)
    return current.map((p, i) => ({
      label: p.label,
      current: p.revenue,
      previous: previous[i]?.revenue ?? 0,
    }))
  }, [orders, prevOrders, range, prev])

  const payments = useMemo(() => paymentBreakdown(orders, db.payments), [orders, db.payments])
  const paymentTotal = payments.reduce((a, p) => a + p.amount, 0)

  const products = useMemo(() => productPerformance(orders, db.products), [orders, db.products])
  const best = useMemo(() => [...products].filter((p) => p.quantity > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10), [products])
  const worst = useMemo(() => [...products].sort((a, b) => a.quantity - b.quantity).slice(0, 8), [products])
  const categories = useMemo(() => categoryPerformance(orders, db.products, db.categories), [orders, db.products, db.categories])
  const cashiers = useMemo(() => cashierPerformance(orders, db.users), [orders, db.users])
  const stock = useMemo(() => stockOverview(db.inventory, db.products), [db.inventory, db.products])
  const moving = useMemo(
    () => movementClassification(orders, db.products, db.inventory, days),
    [orders, db.products, db.inventory, days],
  )
  const target = useMemo(() => targetProgress(periodKey(new Date()), db.orders, db.targets), [db.orders, db.targets])
  const targets6 = useMemo(() => targetHistory(db.orders, db.targets, 6), [db.orders, db.targets])

  const stockAlerts = useMemo(
    () =>
      db.inventory
        .map((i) => ({ inv: i, product: db.products.find((p) => p.id === i.product_id), status: stockStatusOf(i.quantity, i.min_quantity) }))
        .filter((r) => r.status !== 'normal' && r.product),
    [db.inventory, db.products],
  )

  const exportSummary = () => {
    const rows = [
      ['Metrik', 'Nilai'],
      ['Periode', `${range.from.toLocaleDateString('id-ID')} - ${range.to.toLocaleDateString('id-ID')}`],
      ['Pendapatan', summary.revenue],
      ['Transaksi', summary.transactions],
      ['Rata-rata transaksi', Math.round(summary.averageOrderValue)],
      ['Item terjual', summary.itemsSold],
      ['Total diskon', summary.discountTotal],
      ['Total pajak', summary.taxTotal],
      ['Total service', summary.serviceTotal],
      ['Total refund', summary.refundTotal],
      ['Estimasi HPP', summary.estimatedCost],
      ['Estimasi laba', summary.estimatedProfit],
      [],
      ['Produk', 'Qty', 'Pendapatan', 'Laba'],
      ...best.map((p) => [p.name, p.quantity, p.revenue, p.profit]),
    ]
    const csv = rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analitik-${toInputDate(range.from)}-${toInputDate(range.to)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Laporan analitik diekspor')
  }

  return (
    <Page
      title="Analitik Bisnis"
      subtitle={`${range.label} · ${summary.transactions} transaksi`}
      actions={
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportSummary}>
          Ekspor
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

      {/* KPI */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Pendapatan" value={formatIDR(summary.revenue)} icon={<Coins className="h-5 w-5" />} tone="brand" delta={delta.revenue} deltaLabel="vs periode sebelumnya" />
        <StatCard label="Total Transaksi" value={formatNumber(summary.transactions)} icon={<Receipt className="h-5 w-5" />} tone="info" delta={delta.transactions} deltaLabel="vs periode sebelumnya" />
        <StatCard label="Rata-rata Nilai Transaksi" value={formatIDR(summary.averageOrderValue)} icon={<ShoppingBag className="h-5 w-5" />} tone="violet" delta={delta.averageOrderValue} deltaLabel="vs periode sebelumnya" />
        <StatCard label="Estimasi Laba Kotor" value={formatIDR(summary.estimatedProfit)} icon={<Wallet className="h-5 w-5" />} tone="success" delta={delta.profit} deltaLabel={`Margin ${formatPercent(summary.marginPercent)}`} />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Item Terjual" value={`${formatNumber(summary.itemsSold)} porsi`} tone="neutral" compact icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Total Diskon" value={formatIDR(summary.discountTotal)} tone="amber" compact icon={<Percent className="h-5 w-5" />} sublabel={`${formatPercent(summary.grossSales ? (summary.discountTotal / summary.grossSales) * 100 : 0)} dari penjualan kotor`} />
        <StatCard label="Total Refund" value={formatIDR(summary.refundTotal)} tone={summary.refundCount ? 'danger' : 'neutral'} compact icon={<Undo2 className="h-5 w-5" />} sublabel={`${summary.refundCount} transaksi`} />
        <StatCard label="Estimasi HPP" value={formatIDR(summary.estimatedCost)} tone="neutral" compact icon={<TrendingDown className="h-5 w-5" />} sublabel="Harga pokok penjualan" />
      </div>

      {/* Tren */}
      <div className="mb-5 grid gap-5">
        <ChartCard
          title="Tren Penjualan"
          subtitle={`Granularitas ${granularity === 'hour' ? 'per jam' : granularity === 'day' ? 'harian' : granularity === 'week' ? 'mingguan' : 'bulanan'}`}
          height={320}
          empty={series.every((p) => p.revenue === 0)}
          action={
            <SegmentedControl
              size="sm"
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: 'hour', label: 'Jam' },
                { value: 'day', label: 'Hari' },
                { value: 'week', label: 'Minggu' },
                { value: 'month', label: 'Bulan' },
              ]}
            />
          }
        >
          <RevenueAreaChart data={series} />
        </ChartCard>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Perbandingan dengan Periode Sebelumnya"
          subtitle={`${range.label} vs periode sebelumnya (${days} hari)`}
          height={300}
          empty={comparison.every((c) => c.current === 0 && c.previous === 0)}
        >
          <ComparisonLineChart
            data={comparison}
            series={[
              { key: 'current', name: 'Periode ini', color: '#10B981' },
              { key: 'previous', name: 'Periode sebelumnya', color: '#94A3B8', dashed: true },
            ]}
          />
        </ChartCard>

        <ChartCard title="Analitik Pembayaran" subtitle="Distribusi nilai per kanal" height={300} empty={paymentTotal === 0}>
          <div className="flex h-full flex-col">
            <div className="h-[168px]">
              <DonutChart
                data={payments.map((p) => ({ name: PAYMENT_LABEL[p.method], value: p.amount, color: PAYMENT_COLOR[p.method] }))}
                centerLabel="Total"
                centerValue={formatCompactIDR(paymentTotal)}
              />
            </div>
            <div className="mt-4">
              <DonutLegend
                data={payments.map((p) => ({ name: PAYMENT_LABEL[p.method], value: p.amount, percent: p.percent, color: PAYMENT_COLOR[p.method] }))}
              />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Produk */}
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="10 Produk Terlaris" subtitle="Berdasarkan pendapatan" height={340} empty={best.length === 0}>
          <SimpleBarChart data={best.map((p) => ({ label: p.name, revenue: p.revenue }))} layout="vertical" colorful />
        </ChartCard>

        <Card>
          <div className="px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Produk Paling Lambat</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">Kandidat evaluasi menu atau promosi</p>
          </div>
          <div className="mt-4">
            {worst.length === 0 ? (
              <EmptyState icon={<Boxes className="h-7 w-7" />} title="Data belum tersedia" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Produk</Th>
                    <Th align="right">Terjual</Th>
                    <Th align="right">Pendapatan</Th>
                    <Th align="right">Laba</Th>
                  </tr>
                </thead>
                <tbody>
                  {worst.map((p) => (
                    <tr key={p.product_id} className="transition-colors hover:bg-ink-50/60">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Glyph name={p.emoji} className="h-4 w-4 text-ink-500" />
                          <span className="text-[13px] font-semibold text-ink-900">{p.name}</span>
                        </div>
                      </Td>
                      <Td align="right" className={cn('tnum font-bold', p.quantity === 0 ? 'text-danger-600' : 'text-ink-700')}>
                        {p.quantity}
                      </Td>
                      <Td align="right" className="tnum text-ink-700">
                        {formatIDR(p.revenue)}
                      </Td>
                      <Td align="right" className="tnum font-semibold text-ink-900">
                        {formatIDR(p.profit)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      {/* Kategori & stok */}
      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Performa Kategori</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Kontribusi terhadap total pendapatan</p>
          <ul className="mt-4 space-y-4">
            {categories.map((c) => (
              <li key={c.category_id}>
                <div className="flex items-center gap-2.5">
                  <Glyph name={c.icon} className="h-4 w-4 text-ink-500" />
                  <span className="flex-1 truncate text-[13px] font-semibold text-ink-700">{c.name}</span>
                  <span className="text-[13px] font-bold tnum text-ink-900">{formatCompactIDR(c.revenue)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={c.percent} className="flex-1" />
                  <span className="w-11 text-right text-[11.5px] font-bold tnum text-ink-400">{c.percent.toFixed(0)}%</span>
                </div>
                <p className="mt-1 text-[11.5px] tnum text-ink-400">{c.quantity} porsi terjual</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Analitik Persediaan</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Nilai & kondisi stok saat ini</p>

          <div className="mt-4 rounded-2xl bg-ink-900 p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Total Nilai Stok (HPP)</p>
            <p className="mt-1 text-[24px] figure">{formatIDR(stock.stockValue)}</p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[12px]">
              <span className="text-white/50">Estimasi nilai jual</span>
              <span className="font-bold tnum">{formatIDR(stock.retailValue)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-warning-50 p-3.5">
              <p className="text-[11px] font-semibold text-warning-700">Stok Rendah</p>
              <p className="mt-0.5 text-[22px] figure text-warning-700">{stock.lowStock + stock.criticalStock}</p>
            </div>
            <div className="rounded-xl bg-danger-50 p-3.5">
              <p className="text-[11px] font-semibold text-danger-700">Stok Habis</p>
              <p className="mt-0.5 text-[22px] figure text-danger-700">{stock.outOfStock}</p>
            </div>
          </div>

          <p className="section-title mb-2 mt-4">Fast Moving</p>
          <ul className="space-y-1.5">
            {moving.fast.slice(0, 4).map((m) => (
              <li key={m.product_id} className="flex items-center gap-2 rounded-lg bg-success-50 px-2.5 py-2">
                <Glyph name={m.emoji} className="h-4 w-4 text-ink-500" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-success-800">{m.name}</span>
                <span className="text-[12px] font-bold tnum text-success-700">{m.quantity}×</span>
              </li>
            ))}
          </ul>

          <p className="section-title mb-2 mt-4">Slow Moving</p>
          <ul className="space-y-1.5">
            {moving.slow.slice(0, 4).map((m) => (
              <li key={m.product_id} className="flex items-center gap-2 rounded-lg bg-ink-100 px-2.5 py-2">
                <Glyph name={m.emoji} className="h-4 w-4 text-ink-500" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-700">{m.name}</span>
                <span className="text-[12px] font-bold tnum text-ink-500">{m.quantity}×</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Pencapaian Target</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">KPI bulan berjalan · {target.label}</p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-ink-100 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Omzet</p>
              <p className="mt-0.5 text-[22px] figure text-ink-900">
                {target.hasTarget ? `${target.revenuePercent.toFixed(0)}%` : '-'}
              </p>
            </div>
            <div className="rounded-xl bg-ink-100 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Transaksi</p>
              <p className="mt-0.5 text-[22px] figure text-ink-900">
                {target.transactionTarget ? `${target.transactionPercent.toFixed(0)}%` : '-'}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-ink-200 px-3.5 py-3">
              <span className="text-[12.5px] font-semibold text-ink-600">Status</span>
              <Badge tone={TARGET_STATUS_BADGE[target.status]} dot>
                {target.hasTarget ? TARGET_STATUS_LABEL[target.status] : 'Tanpa Target'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-ink-200 px-3.5 py-3">
              <span className="text-[12.5px] font-semibold text-ink-600">Perlu dicapai / hari</span>
              <span className="text-[15px] figure text-ink-900">
                {target.hasTarget ? formatCompactIDR(target.requiredPerDay) : '-'}
              </span>
            </div>
          </div>

          <p className="section-title mb-2 mt-4">Riwayat Pencapaian</p>
          <ul className="space-y-1.5">
            {targets6.slice(-4).reverse().map((t) => (
              <li key={t.period} className="flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-2">
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-700">{t.label}</span>
                <span className="text-[12px] tnum text-ink-500">{formatCompactIDR(t.revenueActual)}</span>
                <Badge tone={t.revenuePercent >= 100 ? 'success' : t.hasTarget ? 'warning' : 'neutral'}>
                  {t.hasTarget ? `${t.revenuePercent.toFixed(0)}%` : '-'}
                </Badge>
              </li>
            ))}
          </ul>

          <p className="section-title mb-2 mt-4">Peringatan Stok</p>
          {stockAlerts.length === 0 ? (
            <p className="rounded-xl bg-success-50 p-3 text-[12.5px] font-medium text-success-700">Seluruh stok aman.</p>
          ) : (
            <ul className="space-y-1.5">
              {stockAlerts.slice(0, 5).map(({ inv, product, status }) => (
                <li key={inv.id} className="flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-2">
                  <Glyph name={product!.emoji} className="h-4 w-4 text-ink-500" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-700">{product!.name}</span>
                  <Badge tone={status === 'out' ? 'danger' : status === 'critical' ? 'amber' : 'warning'}>
                    {inv.quantity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Kasir */}
      <Card>
        <div className="px-5 pt-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Performa Kasir</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Kontribusi masing-masing kasir pada periode terpilih</p>
        </div>
        <div className="mt-4">
          {cashiers.length === 0 ? (
            <EmptyState icon={<Users className="h-7 w-7" />} title="Belum ada aktivitas kasir" description="Data akan tampil setelah ada transaksi pada periode ini." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Kasir</Th>
                  <Th align="right">Transaksi</Th>
                  <Th align="right">Pendapatan</Th>
                  <Th align="right">Rata-rata</Th>
                  <Th align="right">Refund</Th>
                  <Th align="right">Void</Th>
                  <Th>Kontribusi</Th>
                </tr>
              </thead>
              <tbody>
                {cashiers.map((c) => {
                  const share = summary.revenue ? (c.revenue / summary.revenue) * 100 : 0
                  return (
                    <tr key={c.user_id} className="transition-colors hover:bg-ink-50/60">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} gradient={c.avatar_color} size="sm" />
                          <span className="text-[13px] font-semibold text-ink-900">{c.name}</span>
                        </div>
                      </Td>
                      <Td align="right" className="tnum font-bold text-ink-800">
                        {c.transactions}
                      </Td>
                      <Td align="right" className="figure text-ink-900">
                        {formatIDR(c.revenue)}
                      </Td>
                      <Td align="right" className="tnum text-ink-600">
                        {formatIDR(c.averageOrderValue)}
                      </Td>
                      <Td align="right" className={cn('tnum font-semibold', c.refunds ? 'text-danger-600' : 'text-ink-400')}>
                        {c.refunds}
                      </Td>
                      <Td align="right" className={cn('tnum font-semibold', c.voids ? 'text-warning-600' : 'text-ink-400')}>
                        {c.voids}
                      </Td>
                      <Td className="w-40">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={share} className="flex-1" />
                          <span className="w-10 text-right text-[11.5px] font-bold tnum text-ink-500">{share.toFixed(0)}%</span>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </Page>
  )
}
