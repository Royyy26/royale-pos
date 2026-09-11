import { useMemo } from 'react'
import { Banknote, CreditCard, Landmark, Percent, Printer, QrCode, Receipt, TrendingUp, Undo2, XCircle } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ProgressBar, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard, StatRow } from '@/components/ui/StatCard'
import { ChartCard, DonutChart, DonutLegend, RevenueAreaChart } from '@/components/charts'
import { cn, formatCompactIDR, formatDateFull, formatIDR, formatTime } from '@/lib/utils'
import {
  filterOrders,
  hourlySeries,
  paymentBreakdown,
  previousRange,
  productPerformance,
  resolveRange,
  summarize,
  compareSummary,
} from '@/lib/analytics'
import { PAYMENT_COLOR, PAYMENT_LABEL, OrderStatusBadge, PaymentBadge } from '@/lib/labels'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { Glyph } from '@/lib/glyphs'

export function TodaySalesPage() {
  const db = useDataStore((s) => s.db)
  const user = useAuthStore((s) => s.user)!
  const has = useAuthStore((s) => s.has)
  const canSeeAll = has('report.view.full')

  const range = useMemo(() => resolveRange('today'), [])
  const orders = useMemo(
    () => filterOrders(db.orders, range).filter((o) => (canSeeAll ? true : o.cashier_id === user.id)),
    [db.orders, range, canSeeAll, user.id],
  )
  const prevOrders = useMemo(
    () => filterOrders(db.orders, previousRange(range)).filter((o) => (canSeeAll ? true : o.cashier_id === user.id)),
    [db.orders, range, canSeeAll, user.id],
  )

  const summary = useMemo(() => summarize(orders), [orders])
  const prevSummary = useMemo(() => summarize(prevOrders), [prevOrders])
  const delta = useMemo(() => compareSummary(summary, prevSummary), [summary, prevSummary])
  const payments = useMemo(() => paymentBreakdown(orders, db.payments), [orders, db.payments])
  const hourly = useMemo(() => hourlySeries(orders), [orders])
  const topProducts = useMemo(
    () =>
      productPerformance(orders, db.products)
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
    [orders, db.products],
  )

  const paymentTotal = payments.reduce((a, p) => a + p.amount, 0)
  const peak = hourly.reduce((best, p) => (p.revenue > best.revenue ? p : best), hourly[0])

  const methodIcon = { cash: Banknote, qris: QrCode, transfer: Landmark, card: CreditCard } as const

  return (
    <Page
      title="Laporan Penjualan Hari Ini"
      subtitle={formatDateFull(new Date())}
      actions={
        <Button variant="outline" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
          Cetak Laporan
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Penjualan"
          value={formatIDR(summary.revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
          delta={delta.revenue}
          deltaLabel="vs kemarin"
        />
        <StatCard
          label="Jumlah Transaksi"
          value={summary.transactions}
          icon={<Receipt className="h-5 w-5" />}
          tone="info"
          delta={delta.transactions}
          deltaLabel="vs kemarin"
        />
        <StatCard
          label="Rata-rata Transaksi"
          value={formatIDR(summary.averageOrderValue)}
          icon={<Percent className="h-5 w-5" />}
          tone="violet"
          delta={delta.averageOrderValue}
          deltaLabel="vs kemarin"
        />
        <StatCard
          label="Item Terjual"
          value={`${summary.itemsSold}`}
          sublabel="porsi"
          icon={<Receipt className="h-5 w-5" />}
          tone="amber"
          delta={delta.itemsSold}
          deltaLabel="vs kemarin"
        />
      </div>

      {/* Rincian metode */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {payments.map((p) => {
          const Icon = methodIcon[p.method]
          return (
            <Card key={p.method} className="p-5">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: PAYMENT_COLOR[p.method] }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{PAYMENT_LABEL[p.method]}</p>
                  <p className="mt-0.5 text-[19px] figure leading-none text-ink-900">{formatIDR(p.amount)}</p>
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-3">
                <ProgressBar value={p.percent} tone="brand" className="flex-1" />
                <span className="text-[12px] font-bold tnum text-ink-500">{p.percent.toFixed(1).replace('.', ',')}%</span>
              </div>
              <p className="mt-2 text-[12px] text-ink-500">{p.count} transaksi</p>
            </Card>
          )
        })}
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="Pendapatan per Jam"
          subtitle={peak && peak.revenue > 0 ? `Jam tersibuk: ${peak.label} (${formatIDR(peak.revenue)})` : 'Belum ada transaksi hari ini'}
          height={300}
          empty={summary.transactions === 0}
        >
          <RevenueAreaChart data={hourly} />
        </ChartCard>

        <ChartCard title="Komposisi Pembayaran" subtitle="Proporsi nilai transaksi hari ini" height={300} empty={paymentTotal === 0}>
          <div className="flex h-full flex-col">
            <div className="h-[170px]">
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

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <Card className="p-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Ikhtisar Keuangan</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Rekapitulasi nilai transaksi hari ini</p>
          <div className="mt-4 divide-y divide-ink-100">
            <StatRow label="Penjualan kotor (sebelum diskon)" value={formatIDR(summary.grossSales)} />
            <StatRow label="Total diskon" value={`-${formatIDR(summary.discountTotal)}`} tone="danger" />
            <StatRow label="Service charge" value={formatIDR(summary.serviceTotal)} />
            <StatRow label="Pajak (PPN)" value={formatIDR(summary.taxTotal)} />
            <StatRow label="Pendapatan bersih" value={formatIDR(summary.revenue)} bold />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-danger-50 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-danger-600">
                <Undo2 className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-danger-700">Refund</p>
              <p className="mt-0.5 text-[19px] figure text-danger-700">{summary.refundCount}</p>
              <p className="text-[12px] text-danger-600">{formatIDR(summary.refundTotal)}</p>
            </div>
            <div className="rounded-2xl bg-ink-100 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-ink-600">
                <XCircle className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-600">Void</p>
              <p className="mt-0.5 text-[19px] figure text-ink-900">{summary.voidCount}</p>
              <p className="text-[12px] text-ink-500">{formatIDR(summary.voidTotal)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Menu Terlaris Hari Ini</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">Berdasarkan jumlah porsi terjual</p>
          </div>
          <div className="mt-4">
            {topProducts.length === 0 ? (
              <EmptyState icon={<Receipt className="h-7 w-7" />} title="Belum ada penjualan" description="Menu terlaris akan tampil setelah ada transaksi." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Menu</Th>
                    <Th align="right">Terjual</Th>
                    <Th align="right">Pendapatan</Th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.product_id} className="transition-colors hover:bg-ink-50/60">
                      <Td className="w-10 tnum font-bold text-ink-400">{i + 1}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Glyph name={p.emoji} className="h-4 w-4 text-ink-500" />
                          <span className="text-[13px] font-semibold text-ink-900">{p.name}</span>
                        </div>
                      </Td>
                      <Td align="right" className="tnum font-bold text-ink-800">
                        {p.quantity}
                      </Td>
                      <Td align="right" className="figure text-ink-900">
                        {formatIDR(p.revenue)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="px-5 pt-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Daftar Transaksi Hari Ini</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">{orders.length} transaksi tercatat</p>
        </div>
        <div className="mt-4">
          {orders.length === 0 ? (
            <EmptyState icon={<Receipt className="h-7 w-7" />} title="Belum ada transaksi" description="Data akan muncul setelah transaksi pertama hari ini." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Waktu</Th>
                  <Th>No. Pesanan</Th>
                  {canSeeAll && <Th>Kasir</Th>}
                  <Th>Item</Th>
                  <Th>Metode</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 25).map((o) => {
                  const p = db.payments.find((x) => x.order_id === o.id)
                  return (
                    <tr key={o.id} className="transition-colors hover:bg-ink-50/60">
                      <Td className="tnum text-[13px] text-ink-500">{formatTime(o.created_at)}</Td>
                      <Td className="font-semibold text-ink-900">{o.order_number}</Td>
                      {canSeeAll && <Td className="text-[12.5px] text-ink-600">{o.cashier_name}</Td>}
                      <Td className="tnum text-[12.5px] text-ink-600">{o.items.reduce((a, i) => a + i.quantity, 0)} porsi</Td>
                      <Td>{p ? <PaymentBadge method={p.method} /> : '-'}</Td>
                      <Td align="center">
                        <OrderStatusBadge status={o.status} />
                      </Td>
                      <Td align="right" className={cn('figure', o.status === 'cancelled' ? 'text-ink-400 line-through' : 'text-ink-900')}>
                        {formatIDR(o.total)}
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
