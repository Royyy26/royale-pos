import { useMemo, useState } from 'react'
import { Download, FileBarChart, Printer } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, SegmentedControl, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard, StatRow } from '@/components/ui/StatCard'
import { RangeFilter } from '@/components/ui/RangeFilter'
import { cn, formatDateShort, formatIDR, formatNumber, formatPercent, toInputDate } from '@/lib/utils'
import {
  cashierPerformance,
  categoryPerformance,
  dailySeries,
  filterOrders,
  paymentBreakdown,
  productPerformance,
  resolveRange,
  summarize,
  type RangePreset,
} from '@/lib/analytics'
import { PAYMENT_LABEL, stockStatusOf } from '@/lib/labels'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

type ReportTab = 'sales' | 'products' | 'payments' | 'cashiers' | 'inventory'

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'products', label: 'Produk' },
  { value: 'payments', label: 'Pembayaran' },
  { value: 'cashiers', label: 'Kasir' },
  { value: 'inventory', label: 'Persediaan' },
]

export function ReportsPage() {
  const db = useDataStore((s) => s.db)
  const [preset, setPreset] = useState<RangePreset>('this_month')
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()))
  const [customTo, setCustomTo] = useState(toInputDate(new Date()))
  const [tab, setTab] = useState<ReportTab>('sales')

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo])
  const orders = useMemo(() => filterOrders(db.orders, range), [db.orders, range])
  const summary = useMemo(() => summarize(orders), [orders])
  const daily = useMemo(() => dailySeries(orders, range), [orders, range])
  const products = useMemo(
    () => productPerformance(orders, db.products).sort((a, b) => b.revenue - a.revenue),
    [orders, db.products],
  )
  const categories = useMemo(() => categoryPerformance(orders, db.products, db.categories), [orders, db.products, db.categories])
  const payments = useMemo(() => paymentBreakdown(orders, db.payments), [orders, db.payments])
  const cashiers = useMemo(() => cashierPerformance(orders, db.users), [orders, db.users])

  const inventoryRows = useMemo(
    () =>
      db.inventory
        .map((i) => {
          const product = db.products.find((p) => p.id === i.product_id)
          return {
            inv: i,
            product,
            status: stockStatusOf(i.quantity, i.min_quantity),
            value: (product?.cost_price ?? 0) * i.quantity,
            retail: (product?.price ?? 0) * i.quantity,
          }
        })
        .filter((r) => r.product)
        .sort((a, b) => b.value - a.value),
    [db.inventory, db.products],
  )

  const download = (name: string, rows: (string | number)[][]) => {
    const csv = rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}-${toInputDate(range.from)}-${toInputDate(range.to)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Laporan diunduh', `${name}.csv siap digunakan.`)
  }

  const exportCurrent = () => {
    if (tab === 'sales') {
      download('laporan-penjualan-harian', [
        ['Tanggal', 'Transaksi', 'Item', 'Pendapatan'],
        ...daily.map((d) => [d.label, d.transactions, d.items, d.revenue]),
      ])
    } else if (tab === 'products') {
      download('laporan-produk', [
        ['Produk', 'Qty', 'Pendapatan', 'HPP', 'Laba'],
        ...products.map((p) => [p.name, p.quantity, p.revenue, p.cost, p.profit]),
      ])
    } else if (tab === 'payments') {
      download('laporan-pembayaran', [
        ['Metode', 'Transaksi', 'Nilai', 'Persentase'],
        ...payments.map((p) => [PAYMENT_LABEL[p.method], p.count, p.amount, p.percent.toFixed(2)]),
      ])
    } else if (tab === 'cashiers') {
      download('laporan-kasir', [
        ['Kasir', 'Transaksi', 'Pendapatan', 'Rata-rata', 'Refund', 'Void'],
        ...cashiers.map((c) => [c.name, c.transactions, c.revenue, Math.round(c.averageOrderValue), c.refunds, c.voids]),
      ])
    } else {
      download('laporan-persediaan', [
        ['Produk', 'SKU', 'Stok', 'Satuan', 'Minimum', 'Status', 'Nilai HPP', 'Nilai Jual'],
        ...inventoryRows.map((r) => [
          r.product!.name,
          r.product!.sku,
          r.inv.quantity,
          r.inv.unit,
          r.inv.min_quantity,
          r.status,
          r.value,
          r.retail,
        ]),
      ])
    }
  }

  return (
    <Page
      title="Laporan"
      subtitle={`${range.label} · ${formatDateShort(range.from)} s/d ${formatDateShort(range.to)}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Cetak
          </Button>
          <Button leftIcon={<Download className="h-4 w-4" />} onClick={exportCurrent}>
            Ekspor CSV
          </Button>
        </div>
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
        <StatCard label="Pendapatan" value={formatIDR(summary.revenue)} tone="brand" compact />
        <StatCard label="Transaksi" value={formatNumber(summary.transactions)} tone="info" compact />
        <StatCard label="Item Terjual" value={`${formatNumber(summary.itemsSold)} porsi`} tone="violet" compact />
        <StatCard label="Estimasi Laba" value={formatIDR(summary.estimatedProfit)} tone="success" compact sublabel={`Margin ${formatPercent(summary.marginPercent)}`} />
      </div>

      <div className="mb-4">
        <SegmentedControl value={tab} onChange={setTab} options={TABS} />
      </div>

      {tab === 'sales' && (
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <div className="px-5 pt-5">
              <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Rekap Penjualan Harian</h3>
              <p className="mt-0.5 text-[13px] text-ink-500">{daily.length} hari pada periode ini</p>
            </div>
            <div className="mt-4 max-h-[520px] overflow-y-auto">
              <Table>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <Th>Tanggal</Th>
                    <Th align="right">Transaksi</Th>
                    <Th align="right">Item</Th>
                    <Th align="right">Pendapatan</Th>
                    <Th align="right">Rata-rata</Th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.key} className="transition-colors hover:bg-ink-50/60">
                      <Td className="font-semibold text-ink-800">{d.label}</Td>
                      <Td align="right" className="tnum text-ink-600">{d.transactions}</Td>
                      <Td align="right" className="tnum text-ink-600">{d.items}</Td>
                      <Td align="right" className="figure text-ink-900">{formatIDR(d.revenue)}</Td>
                      <Td align="right" className="tnum text-ink-600">
                        {formatIDR(d.transactions ? d.revenue / d.transactions : 0)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-ink-50">
                    <Td className="font-extrabold text-ink-900">Total</Td>
                    <Td align="right" className="figure text-ink-900">{summary.transactions}</Td>
                    <Td align="right" className="figure text-ink-900">{summary.itemsSold}</Td>
                    <Td align="right" className="figure text-ink-900">{formatIDR(summary.revenue)}</Td>
                    <Td align="right" className="figure text-ink-900">{formatIDR(summary.averageOrderValue)}</Td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Ikhtisar Keuangan</h3>
              <div className="mt-3 divide-y divide-ink-100">
                <StatRow label="Penjualan kotor" value={formatIDR(summary.grossSales)} />
                <StatRow label="Diskon" value={`-${formatIDR(summary.discountTotal)}`} tone="danger" />
                <StatRow label="Service charge" value={formatIDR(summary.serviceTotal)} />
                <StatRow label="Pajak (PPN)" value={formatIDR(summary.taxTotal)} />
                <StatRow label="Pendapatan bersih" value={formatIDR(summary.revenue)} bold />
                <StatRow label="Estimasi HPP" value={`-${formatIDR(summary.estimatedCost)}`} tone="danger" />
                <StatRow label="Estimasi laba kotor" value={formatIDR(summary.estimatedProfit)} bold tone="success" />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Kontribusi Kategori</h3>
              <div className="mt-3 divide-y divide-ink-100">
                {categories.map((c) => (
                  <StatRow key={c.category_id} label={c.name} value={`${formatIDR(c.revenue)} · ${c.percent.toFixed(0)}%`} />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Transaksi Bermasalah</h3>
              <div className="mt-3 divide-y divide-ink-100">
                <StatRow label="Refund" value={`${summary.refundCount} · ${formatIDR(summary.refundTotal)}`} tone="danger" />
                <StatRow label="Void / dibatalkan" value={`${summary.voidCount} · ${formatIDR(summary.voidTotal)}`} tone="danger" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <Card>
          <div className="px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Laporan Penjualan Produk</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">{products.filter((p) => p.quantity > 0).length} produk terjual pada periode ini</p>
          </div>
          <div className="mt-4">
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Produk</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Pendapatan</Th>
                  <Th align="right">HPP</Th>
                  <Th align="right">Laba</Th>
                  <Th align="right">Margin</Th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.product_id} className="transition-colors hover:bg-ink-50/60">
                    <Td className="w-10 tnum text-ink-400">{i + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Glyph name={p.emoji} className="h-4 w-4 text-ink-500" />
                        <span className="text-[13px] font-semibold text-ink-900">{p.name}</span>
                      </div>
                    </Td>
                    <Td align="right" className={cn('tnum font-bold', p.quantity === 0 ? 'text-ink-300' : 'text-ink-800')}>
                      {p.quantity}
                    </Td>
                    <Td align="right" className="tnum font-semibold text-ink-900">{formatIDR(p.revenue)}</Td>
                    <Td align="right" className="tnum text-ink-500">{formatIDR(p.cost)}</Td>
                    <Td align="right" className="tnum font-bold text-success-700">{formatIDR(p.profit)}</Td>
                    <Td align="right" className="tnum text-ink-600">
                      {p.revenue ? formatPercent((p.profit / p.revenue) * 100) : '-'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {tab === 'payments' && (
        <Card>
          <div className="px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Laporan Metode Pembayaran</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">Rekapitulasi nilai per kanal pembayaran</p>
          </div>
          <div className="mt-4">
            <Table>
              <thead>
                <tr>
                  <Th>Metode</Th>
                  <Th align="right">Jumlah Transaksi</Th>
                  <Th align="right">Total Nilai</Th>
                  <Th align="right">Rata-rata</Th>
                  <Th align="right">Persentase</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.method} className="transition-colors hover:bg-ink-50/60">
                    <Td className="font-semibold text-ink-900">{PAYMENT_LABEL[p.method]}</Td>
                    <Td align="right" className="tnum text-ink-700">{p.count}</Td>
                    <Td align="right" className="figure text-ink-900">{formatIDR(p.amount)}</Td>
                    <Td align="right" className="tnum text-ink-600">{formatIDR(p.count ? p.amount / p.count : 0)}</Td>
                    <Td align="right" className="tnum font-bold text-ink-800">{formatPercent(p.percent)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {tab === 'cashiers' && (
        <Card>
          <div className="px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Laporan Kinerja Kasir</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">Termasuk transaksi bermasalah per kasir</p>
          </div>
          <div className="mt-4">
            {cashiers.length === 0 ? (
              <EmptyState icon={<FileBarChart className="h-7 w-7" />} title="Belum ada data" />
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
                  </tr>
                </thead>
                <tbody>
                  {cashiers.map((c) => (
                    <tr key={c.user_id} className="transition-colors hover:bg-ink-50/60">
                      <Td className="font-semibold text-ink-900">{c.name}</Td>
                      <Td align="right" className="tnum text-ink-700">{c.transactions}</Td>
                      <Td align="right" className="figure text-ink-900">{formatIDR(c.revenue)}</Td>
                      <Td align="right" className="tnum text-ink-600">{formatIDR(c.averageOrderValue)}</Td>
                      <Td align="right" className={cn('tnum font-semibold', c.refunds ? 'text-danger-600' : 'text-ink-400')}>{c.refunds}</Td>
                      <Td align="right" className={cn('tnum font-semibold', c.voids ? 'text-warning-600' : 'text-ink-400')}>{c.voids}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>
      )}

      {tab === 'inventory' && (
        <Card>
          <div className="px-5 pt-5">
            <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Laporan Nilai Persediaan</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">Posisi stok saat ini beserta nilainya</p>
          </div>
          <div className="mt-4">
            <Table>
              <thead>
                <tr>
                  <Th>Produk</Th>
                  <Th>SKU</Th>
                  <Th align="right">Stok</Th>
                  <Th align="right">Minimum</Th>
                  <Th align="right">Nilai HPP</Th>
                  <Th align="right">Nilai Jual</Th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((r) => (
                  <tr key={r.inv.id} className="transition-colors hover:bg-ink-50/60">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Glyph name={r.product!.emoji} className="h-4 w-4 text-ink-500" />
                        <span className="text-[13px] font-semibold text-ink-900">{r.product!.name}</span>
                      </div>
                    </Td>
                    <Td className="tnum text-[12.5px] text-ink-500">{r.product!.sku}</Td>
                    <Td align="right" className={cn('tnum font-bold', r.status === 'out' ? 'text-danger-600' : r.status === 'normal' ? 'text-ink-800' : 'text-warning-600')}>
                      {r.inv.quantity} {r.inv.unit}
                    </Td>
                    <Td align="right" className="tnum text-ink-500">{r.inv.min_quantity}</Td>
                    <Td align="right" className="tnum font-semibold text-ink-900">{formatIDR(r.value)}</Td>
                    <Td align="right" className="tnum text-ink-600">{formatIDR(r.retail)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ink-50">
                  <Td className="font-extrabold text-ink-900" >Total</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td align="right" className="figure text-ink-900">
                    {formatIDR(inventoryRows.reduce((a, r) => a + r.value, 0))}
                  </Td>
                  <Td align="right" className="figure text-ink-900">
                    {formatIDR(inventoryRows.reduce((a, r) => a + r.retail, 0))}
                  </Td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </Card>
      )}
    </Page>
  )
}
