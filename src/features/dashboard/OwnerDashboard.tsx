import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Coins,
  CreditCard,
  PackageX,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Avatar, Badge, Card, EmptyState, ProgressBar } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { ChartCard, DonutChart, DonutLegend, RevenueAreaChart, SimpleBarChart } from '@/components/charts'
import { cn, formatCompactIDR, formatDateFull, formatIDR, formatTime } from '@/lib/utils'
import {
  categoryPerformance,
  cashierPerformance,
  compareSummary,
  dailySeries,
  filterOrders,
  hourlySeries,
  paymentBreakdown,
  previousRange,
  productPerformance,
  resolveRange,
  stockOverview,
  summarize,
} from '@/lib/analytics'
import { PAYMENT_COLOR, PAYMENT_LABEL, PaymentBadge, stockStatusOf } from '@/lib/labels'
import { periodKey, targetProgress } from '@/lib/targets'
import { useDataStore } from '@/store/useDataStore'
import { TargetHeroCard } from '../targets/TargetsPage'
import { Glyph } from '@/lib/glyphs'

export function OwnerDashboard() {
  const db = useDataStore((s) => s.db)
  const navigate = useNavigate()

  const today = useMemo(() => resolveRange('today'), [])
  const week = useMemo(() => resolveRange('this_week'), [])
  const month = useMemo(() => resolveRange('this_month'), [])
  const last30 = useMemo(() => resolveRange('last_30'), [])

  const todayOrders = useMemo(() => filterOrders(db.orders, today), [db.orders, today])
  const weekOrders = useMemo(() => filterOrders(db.orders, week), [db.orders, week])
  const monthOrders = useMemo(() => filterOrders(db.orders, month), [db.orders, month])
  const last30Orders = useMemo(() => filterOrders(db.orders, last30), [db.orders, last30])

  const todaySummary = useMemo(() => summarize(todayOrders), [todayOrders])
  const yesterdaySummary = useMemo(
    () => summarize(filterOrders(db.orders, previousRange(today))),
    [db.orders, today],
  )
  const weekSummary = useMemo(() => summarize(weekOrders), [weekOrders])
  const monthSummary = useMemo(() => summarize(monthOrders), [monthOrders])
  const delta = useMemo(() => compareSummary(todaySummary, yesterdaySummary), [todaySummary, yesterdaySummary])

  const trend = useMemo(() => dailySeries(last30Orders, last30), [last30Orders, last30])
  const hourly = useMemo(() => hourlySeries(todayOrders), [todayOrders])
  const payments = useMemo(() => paymentBreakdown(last30Orders, db.payments), [last30Orders, db.payments])
  const paymentsTotal = payments.reduce((a, p) => a + p.amount, 0)

  const topProducts = useMemo(
    () =>
      productPerformance(last30Orders, db.products)
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 7),
    [last30Orders, db.products],
  )
  const categories = useMemo(
    () => categoryPerformance(last30Orders, db.products, db.categories),
    [last30Orders, db.products, db.categories],
  )
  const cashiers = useMemo(() => cashierPerformance(monthOrders, db.users), [monthOrders, db.users])
  const stock = useMemo(() => stockOverview(db.inventory, db.products), [db.inventory, db.products])
  const target = useMemo(() => targetProgress(periodKey(new Date()), db.orders, db.targets), [db.orders, db.targets])

  const lowStockList = useMemo(
    () =>
      db.inventory
        .map((i) => ({ inv: i, product: db.products.find((p) => p.id === i.product_id), status: stockStatusOf(i.quantity, i.min_quantity) }))
        .filter((r) => r.status !== 'normal' && r.product)
        .sort((a, b) => a.inv.quantity - b.inv.quantity)
        .slice(0, 6),
    [db.inventory, db.products],
  )

  return (
    <Page
      title="Dashboard Bisnis"
      subtitle={formatDateFull(new Date())}
      actions={
        <Link to="/analytics">
          <Button variant="dark" leftIcon={<BarChart3 className="h-4 w-4" />}>
            Analitik Lengkap
          </Button>
        </Link>
      }
    >
      {/* Target bulan berjalan */}
      <div className="mb-5">
        <TargetHeroCard progress={target} onEdit={() => navigate('/targets')} />
      </div>

      {/* KPI utama */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatIDR(todaySummary.revenue)}
          icon={<Coins className="h-5 w-5" />}
          tone="brand"
          delta={delta.revenue}
          deltaLabel="vs kemarin"
        />
        <StatCard
          label="Pendapatan Minggu Ini"
          value={formatIDR(weekSummary.revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
          sublabel={`${weekSummary.transactions} transaksi`}
        />
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatIDR(monthSummary.revenue)}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="violet"
          sublabel={`${monthSummary.transactions} transaksi`}
        />
        <StatCard
          label="Estimasi Laba Bulan Ini"
          value={formatIDR(monthSummary.estimatedProfit)}
          icon={<Wallet className="h-5 w-5" />}
          tone="success"
          sublabel={`Margin ${monthSummary.marginPercent.toFixed(1).replace('.', ',')}% · HPP ${formatCompactIDR(monthSummary.estimatedCost)}`}
        />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Transaksi Hari Ini"
          value={todaySummary.transactions}
          icon={<Receipt className="h-5 w-5" />}
          tone="neutral"
          delta={delta.transactions}
          deltaLabel="vs kemarin"
          compact
        />
        <StatCard
          label="Rata-rata Nilai Transaksi"
          value={formatIDR(todaySummary.averageOrderValue)}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="neutral"
          delta={delta.averageOrderValue}
          deltaLabel="vs kemarin"
          compact
        />
        <StatCard
          label="Total Diskon (30 hari)"
          value={formatIDR(summarize(last30Orders).discountTotal)}
          icon={<Percent className="h-5 w-5" />}
          tone="amber"
          compact
          sublabel="Promo & voucher"
        />
        <StatCard
          label="Total Refund (30 hari)"
          value={formatIDR(summarize(last30Orders).refundTotal)}
          icon={<Undo2 className="h-5 w-5" />}
          tone={summarize(last30Orders).refundCount > 0 ? 'danger' : 'neutral'}
          compact
          sublabel={`${summarize(last30Orders).refundCount} transaksi`}
        />
      </div>

      {/* Tren & pembayaran */}
      <div className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <ChartCard
          title="Tren Pendapatan 30 Hari"
          subtitle="Pendapatan harian termasuk pajak & service charge"
          height={300}
          empty={trend.every((p) => p.revenue === 0)}
        >
          <RevenueAreaChart data={trend} />
        </ChartCard>

        <ChartCard
          title="Distribusi Metode Pembayaran"
          subtitle="Akumulasi 30 hari terakhir"
          height={300}
          empty={paymentsTotal === 0}
        >
          <div className="flex h-full flex-col">
            <div className="h-[170px]">
              <DonutChart
                data={payments.map((p) => ({
                  name: PAYMENT_LABEL[p.method],
                  value: p.amount,
                  color: PAYMENT_COLOR[p.method],
                }))}
                centerLabel="Total"
                centerValue={formatCompactIDR(paymentsTotal)}
              />
            </div>
            <div className="mt-4">
              <DonutLegend
                data={payments.map((p) => ({
                  name: PAYMENT_LABEL[p.method],
                  value: p.amount,
                  percent: p.percent,
                  color: PAYMENT_COLOR[p.method],
                }))}
              />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Produk & jam */}
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Produk Terlaris"
          subtitle="Berdasarkan pendapatan 30 hari terakhir"
          height={290}
          empty={topProducts.length === 0}
          action={
            <Link to="/analytics">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Detail
              </Button>
            </Link>
          }
        >
          <SimpleBarChart
            data={topProducts.map((p) => ({ label: p.name, revenue: p.revenue }))}
            layout="vertical"
            colorful
          />
        </ChartCard>

        <ChartCard title="Penjualan per Jam (Hari Ini)" subtitle="Mengidentifikasi jam sibuk operasional" height={290} empty={todaySummary.transactions === 0}>
          <SimpleBarChart data={hourly} color="#6366F1" />
        </ChartCard>
      </div>

      {/* Kategori, stok, kasir */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Performa Kategori</h3>
            <Badge tone="neutral">30 hari</Badge>
          </div>
          <ul className="mt-4 space-y-3.5">
            {categories.map((c) => (
              <li key={c.category_id}>
                <div className="flex items-center gap-2.5">
                  <Glyph name={c.icon} className="h-4 w-4 text-ink-500" />
                  <span className="flex-1 truncate text-[13px] font-semibold text-ink-700">{c.name}</span>
                  <span className="text-[13px] font-bold tnum text-ink-900">{formatCompactIDR(c.revenue)}</span>
                  <span className="w-11 text-right text-[11.5px] font-semibold tnum text-ink-400">
                    {c.percent.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={c.percent} className="mt-2" tone="brand" />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Kondisi Persediaan</h3>
            <Link to="/inventory">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Kelola
              </Button>
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-ink-900 p-3.5 text-white">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/50">Nilai Stok (HPP)</p>
              <p className="mt-1 text-[17px] figure">{formatCompactIDR(stock.stockValue)}</p>
            </div>
            <div className="rounded-xl bg-ink-100 p-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Nilai Jual</p>
              <p className="mt-1 text-[17px] figure text-ink-900">{formatCompactIDR(stock.retailValue)}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Menipis', value: stock.lowStock, tone: 'bg-warning-50 text-warning-700' },
              { label: 'Kritis', value: stock.criticalStock, tone: 'bg-amber-50 text-amber-700' },
              { label: 'Habis', value: stock.outOfStock, tone: 'bg-danger-50 text-danger-700' },
            ].map((s) => (
              <div key={s.label} className={cn('rounded-xl p-3 text-center', s.tone)}>
                <p className="text-[20px] figure leading-none">{s.value}</p>
                <p className="mt-1 text-[10.5px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="section-title mb-2 mt-4">Perlu Segera Diisi</p>
          {lowStockList.length === 0 ? (
            <p className="rounded-xl bg-success-50 p-3 text-[12.5px] font-medium text-success-700">
              Semua stok berada di atas batas minimum.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lowStockList.map(({ inv, product, status }) => (
                <li key={inv.id} className="flex items-center gap-2.5 rounded-lg border border-ink-200 px-2.5 py-2">
                  <Glyph name={product!.emoji} className="h-4 w-4 text-ink-500" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-700">{product!.name}</span>
                  <span className={cn('text-[12px] font-bold tnum', status === 'out' ? 'text-danger-600' : 'text-warning-600')}>
                    {inv.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Performa Kasir</h3>
            <Badge tone="neutral">Bulan ini</Badge>
          </div>
          {cashiers.length === 0 ? (
            <EmptyState icon={<Users className="h-7 w-7" />} title="Belum ada data kasir" className="py-8" />
          ) : (
            <ul className="mt-4 space-y-3">
              {cashiers.slice(0, 5).map((c, i) => (
                <li key={c.user_id} className="flex items-center gap-3">
                  <span className="w-4 text-[12px] font-bold tnum text-ink-400">{i + 1}</span>
                  <Avatar name={c.name} gradient={c.avatar_color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-900">{c.name}</p>
                    <p className="text-[11.5px] tnum text-ink-500">
                      {c.transactions} transaksi · rata-rata {formatCompactIDR(c.averageOrderValue)}
                    </p>
                  </div>
                  <span className="text-[13px] figure text-ink-900">{formatCompactIDR(c.revenue)}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="section-title mb-2 mt-5">Pencapaian Target Bulan Ini</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Omzet', value: `${target.revenuePercent.toFixed(0)}%`, tone: target.revenuePercent >= 100 ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-700' },
              { label: 'Transaksi', value: `${target.transactionPercent.toFixed(0)}%`, tone: target.transactionPercent >= 100 ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-700' },
            ].map((s) => (
              <div key={s.label} className={cn('rounded-xl p-3 text-center', s.tone)}>
                <p className="text-[20px] figure leading-none">{s.value}</p>
                <p className="mt-1 text-[10.5px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-ink-200 px-3.5 py-3">
            <span className="text-[12.5px] font-semibold text-ink-600">Perlu dicapai / hari</span>
            <span className="text-[15px] figure text-ink-900">
              {target.hasTarget ? formatCompactIDR(target.requiredPerDay) : '-'}
            </span>
          </div>
          <Link to="/targets" className="mt-3 block">
            <Button variant="outline" fullWidth size="sm">
              Kelola target & KPI
            </Button>
          </Link>
        </Card>
      </div>

      {/* Transaksi terbaru */}
      <Card className="mt-5">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Transaksi Terbaru</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">Seluruh kasir · realtime</p>
          </div>
          <Link to="/orders">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              Semua pesanan
            </Button>
          </Link>
        </div>
        <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          {db.orders.slice(0, 8).map((o) => {
            const p = db.payments.find((x) => x.order_id === o.id)
            return (
              <div key={o.id} className="rounded-2xl border border-ink-200 p-3.5 transition-colors hover:border-ink-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-ink-900">{o.order_number}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {formatTime(o.created_at)} · {o.cashier_name.split(' ')[0]}
                    </p>
                  </div>
                  {p && <PaymentBadge method={p.method} />}
                </div>
                <p className="mt-2.5 text-[17px] figure text-ink-900">{formatIDR(o.total)}</p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {o.items.length} jenis · {o.items.reduce((a, i) => a + i.quantity, 0)} porsi
                </p>
              </div>
            )
          })}
        </div>
      </Card>
    </Page>
  )
}
