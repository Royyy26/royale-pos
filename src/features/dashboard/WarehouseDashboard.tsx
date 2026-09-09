import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  PackageX,
  ScanLine,
  TriangleAlert,
  Warehouse,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ProgressBar, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { ChartCard, CountBarChart } from '@/components/charts'
import { cn, formatCompactIDR, formatDateFull, formatDateTime, formatNumber, isSameDay } from '@/lib/utils'
import { filterOrders, productPerformance, resolveRange, stockOverview } from '@/lib/analytics'
import { AdjustmentBadge, MovementBadge, StockStatusBadge, stockStatusOf } from '@/lib/labels'
import { useDataStore } from '@/store/useDataStore'
import { Glyph } from '@/lib/glyphs'

export function WarehouseDashboard() {
  const db = useDataStore((s) => s.db)

  const stock = useMemo(() => stockOverview(db.inventory, db.products), [db.inventory, db.products])
  const productMap = useMemo(() => new Map(db.products.map((p) => [p.id, p])), [db.products])

  const todayMovements = useMemo(
    () => db.stock_movements.filter((m) => isSameDay(m.created_at, new Date())),
    [db.stock_movements],
  )

  const pending = db.stock_adjustments.filter((a) => a.status === 'pending')

  const attention = useMemo(
    () =>
      db.inventory
        .map((i) => ({ inv: i, product: productMap.get(i.product_id), status: stockStatusOf(i.quantity, i.min_quantity) }))
        .filter((r) => r.status !== 'normal' && r.product)
        .sort((a, b) => a.inv.quantity / Math.max(1, a.inv.min_quantity) - b.inv.quantity / Math.max(1, b.inv.min_quantity)),
    [db.inventory, productMap],
  )

  const last30 = useMemo(() => resolveRange('last_30'), [])
  const fastMoving = useMemo(
    () =>
      productPerformance(filterOrders(db.orders, last30), db.products)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
    [db.orders, db.products, last30],
  )

  const stockInToday = todayMovements.filter((m) => m.type === 'stock_in').reduce((a, m) => a + m.quantity_change, 0)
  const stockOutToday = todayMovements
    .filter((m) => m.quantity_change < 0)
    .reduce((a, m) => a + Math.abs(m.quantity_change), 0)

  return (
    <Page
      title="Dashboard Gudang"
      subtitle={formatDateFull(new Date())}
      actions={
        <Link to="/stock-opname">
          <Button leftIcon={<ScanLine className="h-4 w-4" />}>Mulai Opname</Button>
        </Link>
      }
    >
      {/* KPI */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Item"
          value={stock.totalItems}
          sublabel={`${formatNumber(stock.totalUnits)} unit tersimpan`}
          icon={<Boxes className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Stok Menipis"
          value={stock.lowStock + stock.criticalStock}
          sublabel={`${stock.criticalStock} di antaranya kritis`}
          icon={<TriangleAlert className="h-5 w-5" />}
          tone={stock.lowStock + stock.criticalStock > 0 ? 'amber' : 'neutral'}
        />
        <StatCard
          label="Stok Habis"
          value={stock.outOfStock}
          sublabel="Perlu segera dipesan ulang"
          icon={<PackageX className="h-5 w-5" />}
          tone={stock.outOfStock > 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          label="Penyesuaian Tertunda"
          value={pending.length}
          sublabel="Menunggu persetujuan owner"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone={pending.length > 0 ? 'info' : 'neutral'}
        />
      </div>

      {/* Pergerakan hari ini */}
      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <Card className="p-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Pergerakan Stok Hari Ini</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">{todayMovements.length} aktivitas tercatat</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-success-50 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-success-600">
                <ArrowDownToLine className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-success-700">Masuk</p>
              <p className="mt-0.5 text-[22px] figure text-success-700">+{formatNumber(stockInToday)}</p>
            </div>
            <div className="rounded-2xl bg-danger-50 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-danger-600">
                <ArrowUpFromLine className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-danger-700">Keluar</p>
              <p className="mt-0.5 text-[22px] figure text-danger-700">-{formatNumber(stockOutToday)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-ink-900 p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Nilai Persediaan (HPP)</p>
            <p className="mt-1 text-[24px] figure">{formatCompactIDR(stock.stockValue)}</p>
            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-white/50">
              <span>Nilai jual estimasi</span>
              <span className="ml-auto font-bold text-white">{formatCompactIDR(stock.retailValue)}</span>
            </div>
          </div>

          <p className="section-title mb-2.5 mt-5">Komposisi Status Stok</p>
          <div className="space-y-2.5">
            {[
              { label: 'Normal', value: stock.normal, tone: 'success' as const },
              { label: 'Menipis', value: stock.lowStock, tone: 'warning' as const },
              { label: 'Kritis', value: stock.criticalStock, tone: 'warning' as const },
              { label: 'Habis', value: stock.outOfStock, tone: 'danger' as const },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-ink-600">{s.label}</span>
                  <span className="font-bold tnum text-ink-900">{s.value}</span>
                </div>
                <ProgressBar value={(s.value / Math.max(1, stock.totalItems)) * 100} tone={s.tone} className="mt-1.5" />
              </div>
            ))}
          </div>
        </Card>

        <ChartCard
          title="Produk Paling Cepat Bergerak"
          subtitle="Kuantitas terjual 30 hari terakhir — prioritas restock"
          height={380}
          empty={fastMoving.every((f) => f.quantity === 0)}
        >
          <CountBarChart
            data={fastMoving.map((f) => ({ label: f.name, quantity: f.quantity }))}
            dataKey="quantity"
            layout="vertical"
            name="Terjual"
            colorful
          />
        </ChartCard>
      </div>

      {/* Perlu perhatian */}
      <Card className="mb-5">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Stok Perlu Perhatian</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">{attention.length} item berada pada atau di bawah batas minimum</p>
          </div>
          <Link to="/inventory">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              Kelola Inventori
            </Button>
          </Link>
        </div>
        <div className="mt-4">
          {attention.length === 0 ? (
            <EmptyState
              icon={<Warehouse className="h-7 w-7" />}
              title="Seluruh stok aman"
              description="Tidak ada produk yang berada di bawah batas minimum saat ini."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Produk</Th>
                  <Th>Lokasi</Th>
                  <Th align="right">Stok</Th>
                  <Th align="right">Minimum</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Terakhir Masuk</Th>
                </tr>
              </thead>
              <tbody>
                {attention.slice(0, 10).map(({ inv, product, status }) => (
                  <tr key={inv.id} className="transition-colors hover:bg-ink-50/60">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100">
                          <Glyph name={product!.emoji} className="h-4 w-4 text-ink-600" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink-900">{product!.name}</p>
                          <p className="text-[11px] tnum text-ink-400">{product!.sku}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-[12.5px] text-ink-500">{inv.location}</Td>
                    <Td align="right" className={cn('tnum font-bold', status === 'out' ? 'text-danger-600' : 'text-warning-600')}>
                      {inv.quantity} {inv.unit}
                    </Td>
                    <Td align="right" className="tnum text-ink-500">
                      {inv.min_quantity}
                    </Td>
                    <Td align="center">
                      <StockStatusBadge status={status} />
                    </Td>
                    <Td align="right" className="text-[12px] text-ink-500">
                      {inv.last_stock_in_at ? formatDateTime(inv.last_stock_in_at) : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Aktivitas Stok Terbaru</h3>
            <Link to="/stock-movement">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Semua
              </Button>
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-ink-100">
            {db.stock_movements.slice(0, 8).map((m) => {
              const product = productMap.get(m.product_id)
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100">
                    <Glyph name={product?.emoji} className="h-4 w-4 text-ink-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{product?.name ?? 'Produk'}</p>
                    <p className="truncate text-[11.5px] text-ink-500">
                      {formatDateTime(m.created_at)} · {m.user_name}
                    </p>
                  </div>
                  <MovementBadge type={m.type} />
                  <span
                    className={cn(
                      'w-14 text-right text-[13px] font-bold tnum',
                      m.quantity_change > 0 ? 'text-success-600' : 'text-danger-600',
                    )}
                  >
                    {m.quantity_change > 0 ? '+' : ''}
                    {m.quantity_change}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Penyesuaian Menunggu Persetujuan</h3>
            <Link to="/stock-adjustment">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Kelola
              </Button>
            </Link>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-7 w-7" />}
              title="Tidak ada penyesuaian tertunda"
              description="Semua pengajuan penyesuaian stok telah ditinjau."
            />
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {pending.map((a) => {
                const product = productMap.get(a.product_id)
                return (
                  <li key={a.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100">
                        <Glyph name={product?.emoji} className="h-4 w-4 text-ink-600" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-ink-900">{product?.name}</p>
                        <p className="text-[11.5px] text-ink-500">
                          Sistem {a.system_quantity} → hitung {a.counted_quantity}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-[14px] figure',
                          a.difference > 0 ? 'text-success-600' : 'text-danger-600',
                        )}
                      >
                        {a.difference > 0 ? '+' : ''}
                        {a.difference}
                      </span>
                      <AdjustmentBadge status={a.status} />
                    </div>
                    <p className="mt-1.5 pl-12 text-[12px] italic text-ink-500">{a.reason}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  )
}
