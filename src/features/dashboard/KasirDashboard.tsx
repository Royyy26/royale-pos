import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Landmark,
  QrCode,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Undo2,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { ChartCard, RevenueAreaChart } from '@/components/charts'
import { cn, formatDateFull, formatIDR, formatTime } from '@/lib/utils'
import { filterOrders, hourlySeries, paymentBreakdown, resolveRange, summarize } from '@/lib/analytics'
import { OrderStatusBadge, PaymentBadge } from '@/lib/labels'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { DailyTargetCard } from '../reports/DailyRecapPage'

export function KasirDashboard() {
  const user = useAuthStore((s) => s.user)!
  const db = useDataStore((s) => s.db)

  const range = useMemo(() => resolveRange('today'), [])

  const myOrders = useMemo(
    () => filterOrders(db.orders, range).filter((o) => o.cashier_id === user.id),
    [db.orders, range, user.id],
  )
  const summary = useMemo(() => summarize(myOrders), [myOrders])
  const payments = useMemo(() => paymentBreakdown(myOrders, db.payments), [myOrders, db.payments])
  const series = useMemo(() => hourlySeries(myOrders), [myOrders])

  const byMethod = (code: string) => payments.find((p) => p.method === code)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  })()

  return (
    <Page
      title="Dashboard Kasir"
      subtitle={formatDateFull(new Date())}
      actions={
        <Link to="/pos">
          <Button leftIcon={<ShoppingCart className="h-4 w-4" />}>Buka POS</Button>
        </Link>
      }
    >
      {/* Sambutan + target harian */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="card relative overflow-hidden bg-gradient-to-br from-ink-900 to-ink-800 p-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <p className="relative text-[13px] font-semibold text-brand-300">{greeting},</p>
          <h2 className="relative mt-1 text-[26px] font-extrabold leading-tight">{user.name}</h2>
          <p className="relative mt-2 max-w-md text-[13.5px] leading-relaxed text-white/55">
            Berikut ringkasan penjualan Anda hari ini. Semua angka diperbarui otomatis setiap transaksi selesai.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] text-white/50">Penjualan Hari Ini</p>
              <p className="mt-0.5 text-[20px] figure">{formatIDR(summary.revenue)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] text-white/50">Transaksi</p>
              <p className="mt-0.5 text-[20px] figure">{summary.transactions}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] text-white/50">Rata-rata / Transaksi</p>
              <p className="mt-0.5 text-[20px] figure">{formatIDR(summary.averageOrderValue)}</p>
            </div>
          </div>
        </div>

        <DailyTargetCard />
      </div>

      {/* KPI pembayaran */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pembayaran Tunai"
          value={formatIDR(byMethod('cash')?.amount ?? 0)}
          sublabel={`${byMethod('cash')?.count ?? 0} transaksi`}
          icon={<Banknote className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Pembayaran QRIS"
          value={formatIDR(byMethod('qris')?.amount ?? 0)}
          sublabel={`${byMethod('qris')?.count ?? 0} transaksi`}
          icon={<QrCode className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="Transfer Bank"
          value={formatIDR(byMethod('transfer')?.amount ?? 0)}
          sublabel={`${byMethod('transfer')?.count ?? 0} transaksi`}
          icon={<Landmark className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Kartu Debit/Kredit"
          value={formatIDR(byMethod('card')?.amount ?? 0)}
          sublabel={`${byMethod('card')?.count ?? 0} transaksi`}
          icon={<CreditCard className="h-5 w-5" />}
          tone="info"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Penjualan per Jam"
          subtitle="Distribusi pendapatan Anda sepanjang hari ini"
          height={260}
          empty={summary.transactions === 0}
        >
          <RevenueAreaChart data={series} />
        </ChartCard>

        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Transaksi Terbaru</h3>
              <p className="mt-0.5 text-[13px] text-ink-500">10 transaksi terakhir Anda</p>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Semua
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            {myOrders.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-7 w-7" />}
                title="Belum ada transaksi hari ini"
                description="Mulai layani pelanggan melalui halaman POS."
                action={
                  <Link to="/pos">
                    <Button leftIcon={<ShoppingCart className="h-4 w-4" />}>Buka POS</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {myOrders.slice(0, 10).map((o) => {
                  const p = db.payments.find((x) => x.order_id === o.id)
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-[13px] font-bold text-ink-600">
                        {o.items.length}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-ink-900">{o.order_number}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                          {formatTime(o.created_at)} · {o.table_name ?? 'Take Away'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[13.5px] figure text-ink-900">{formatIDR(o.total)}</span>
                        {p ? <PaymentBadge method={p.method} /> : <OrderStatusBadge status={o.status} />}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Ringkasan hari */}
      <Card className="mt-5">
        <div className="px-5 pt-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Ringkasan Hari Ini</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Rekapitulasi transaksi yang Anda proses</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Item Terjual', value: `${summary.itemsSold} porsi`, icon: TrendingUp, tone: 'text-brand-600 bg-brand-50' },
            { label: 'Total Diskon', value: formatIDR(summary.discountTotal), icon: Receipt, tone: 'text-amber-600 bg-amber-50' },
            { label: 'Refund', value: `${summary.refundCount} · ${formatIDR(summary.refundTotal)}`, icon: Undo2, tone: 'text-danger-600 bg-danger-50' },
            { label: 'Void / Dibatalkan', value: `${summary.voidCount} · ${formatIDR(summary.voidTotal)}`, icon: Undo2, tone: 'text-ink-600 bg-ink-100' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center gap-3.5 rounded-2xl border border-ink-200 p-4">
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', s.tone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">{s.label}</p>
                  <p className="mt-0.5 truncate text-[15px] figure text-ink-900">{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </Page>
  )
}
