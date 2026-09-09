import { useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Download,
  PackageX,
  Settings2,
  TriangleAlert,
  Warehouse,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, Input, ProgressBar, SearchInput, Select, Table, Td, Textarea, Th } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatDateTime, formatIDR, formatNumber, toInputDate } from '@/lib/utils'
import { MOVEMENT_LABEL, StockStatusBadge, stockStatusOf } from '@/lib/labels'
import { stockOverview } from '@/lib/analytics'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Inventory, Product, ProductStockStatus, StockMovementType } from '@/types'
import { Glyph } from '@/lib/glyphs'

type StatusFilter = ProductStockStatus | 'all'

const ADJUST_TYPES: { value: StockMovementType; label: string; sign: 1 | -1 }[] = [
  { value: 'stock_in', label: 'Stok Masuk', sign: 1 },
  { value: 'stock_out', label: 'Stok Keluar', sign: -1 },
  { value: 'waste', label: 'Waste / Rusak', sign: -1 },
  { value: 'adjustment', label: 'Koreksi Manual', sign: 1 },
]

const REASONS: Record<StockMovementType, string[]> = {
  stock_in: ['Penerimaan dari supplier', 'Restock mingguan', 'Retur dari cabang'],
  stock_out: ['Transfer ke cabang', 'Pemakaian internal', 'Sample tasting'],
  waste: ['Produk rusak', 'Kedaluwarsa', 'Tumpah saat penyajian'],
  adjustment: ['Koreksi kesalahan input', 'Penyesuaian setelah audit'],
  opname: ['Hasil perhitungan fisik'],
  sales_deduction: ['Penjualan'],
  return: ['Pengembalian pesanan'],
}

export function InventoryPage() {
  const db = useDataStore((s) => s.db)
  const adjustStock = useDataStore((s) => s.adjustStock)
  const user = useAuthStore((s) => s.user)!
  const has = useAuthStore((s) => s.has)
  const canAdjust = has('inventory.adjust')

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [target, setTarget] = useState<{ inv: Inventory; product: Product } | null>(null)

  const productMap = useMemo(() => new Map(db.products.map((p) => [p.id, p])), [db.products])
  const overview = useMemo(() => stockOverview(db.inventory, db.products), [db.inventory, db.products])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.inventory
      .map((inv) => ({ inv, product: productMap.get(inv.product_id), status: stockStatusOf(inv.quantity, inv.min_quantity) }))
      .filter((r): r is { inv: Inventory; product: Product; status: ProductStockStatus } => !!r.product)
      .filter((r) => (category === 'all' ? true : r.product.category_id === category))
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => (q ? r.product.name.toLowerCase().includes(q) || r.product.sku.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const order: Record<ProductStockStatus, number> = { out: 0, critical: 1, low: 2, normal: 3 }
        return order[a.status] - order[b.status] || a.product.name.localeCompare(b.product.name)
      })
  }, [db.inventory, productMap, category, statusFilter, query])

  const exportCsv = () => {
    const header = ['Produk', 'SKU', 'Kategori', 'Stok', 'Satuan', 'Minimum', 'Maksimum', 'Status', 'Lokasi', 'Nilai HPP']
    const lines = rows.map((r) =>
      [
        r.product.name,
        r.product.sku,
        db.categories.find((c) => c.id === r.product.category_id)?.name ?? '',
        r.inv.quantity,
        r.inv.unit,
        r.inv.min_quantity,
        r.inv.max_quantity,
        r.status,
        r.inv.location,
        r.inv.quantity * r.product.cost_price,
      ].join(';'),
    )
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventori-${toInputDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data inventori diekspor')
  }

  return (
    <Page
      title="Inventori"
      subtitle={`${rows.length} item ditampilkan dari ${db.inventory.length} total`}
      actions={
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Ekspor CSV
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Nilai Persediaan (HPP)"
          value={formatIDR(overview.stockValue)}
          sublabel={`Estimasi nilai jual ${formatIDR(overview.retailValue)}`}
          tone="brand"
          icon={<Warehouse className="h-5 w-5" />}
        />
        <StatCard label="Total Unit" value={formatNumber(overview.totalUnits)} sublabel={`${overview.totalItems} jenis item`} tone="info" icon={<Boxes className="h-5 w-5" />} />
        <StatCard
          label="Stok Menipis"
          value={overview.lowStock + overview.criticalStock}
          sublabel={`${overview.criticalStock} kritis`}
          tone={overview.lowStock + overview.criticalStock ? 'amber' : 'neutral'}
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <StatCard label="Stok Habis" value={overview.outOfStock} sublabel="Perlu pemesanan ulang" tone={overview.outOfStock ? 'danger' : 'neutral'} icon={<PackageX className="h-5 w-5" />} />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk atau SKU…" />
          </div>
          <div className="w-48">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[{ value: 'all', label: 'Semua Kategori' }, ...db.categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'normal', label: 'Stok Normal' },
                { value: 'low', label: 'Stok Rendah' },
                { value: 'critical', label: 'Stok Kritis' },
                { value: 'out', label: 'Stok Habis' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<Warehouse className="h-7 w-7" />} title="Tidak ada item" description="Sesuaikan filter untuk melihat item lainnya." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Produk</Th>
                <Th>Lokasi</Th>
                <Th align="right">Stok</Th>
                <Th align="right">Min / Maks</Th>
                <Th>Level</Th>
                <Th align="center">Status</Th>
                <Th align="right">Nilai HPP</Th>
                <Th align="right">Terakhir Masuk</Th>
                {canAdjust && <Th align="center">Aksi</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, product, status }) => {
                const level = Math.min(100, (inv.quantity / Math.max(1, inv.max_quantity)) * 100)
                return (
                  <tr key={inv.id} className="transition-colors hover:bg-ink-50/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br', product.gradient)}>
                          <Glyph name={product.emoji} className="h-5 w-5 text-ink-700" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink-900">{product.name}</p>
                          <p className="truncate text-[11.5px] tnum text-ink-400">{product.sku}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-[12.5px] text-ink-500">{inv.location}</Td>
                    <Td align="right">
                      <span className={cn('text-[15px] figure', status === 'out' ? 'text-danger-600' : status === 'normal' ? 'text-ink-900' : 'text-warning-600')}>
                        {inv.quantity}
                      </span>
                      <span className="ml-1 text-[11.5px] text-ink-400">{inv.unit}</span>
                    </Td>
                    <Td align="right" className="tnum text-[12.5px] text-ink-500">
                      {inv.min_quantity} / {inv.max_quantity}
                    </Td>
                    <Td className="w-32">
                      <ProgressBar value={level} tone={status === 'out' || status === 'critical' ? 'danger' : status === 'low' ? 'warning' : 'success'} />
                    </Td>
                    <Td align="center">
                      <StockStatusBadge status={status} />
                    </Td>
                    <Td align="right" className="tnum font-semibold text-ink-800">
                      {formatIDR(inv.quantity * product.cost_price)}
                    </Td>
                    <Td align="right" className="text-[12px] text-ink-500">
                      {inv.last_stock_in_at ? formatDateTime(inv.last_stock_in_at) : '—'}
                    </Td>
                    {canAdjust && (
                      <Td align="center">
                        <Button variant="outline" size="sm" leftIcon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setTarget({ inv, product })}>
                          Sesuaikan
                        </Button>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <AdjustModal
        target={target}
        onClose={() => setTarget(null)}
        onSubmit={(type, change, reason) => {
          if (!target) return
          adjustStock(target.product.id, type, change, reason, user)
          toast.success('Stok diperbarui', `${target.product.name}: ${change > 0 ? '+' : ''}${change} ${target.inv.unit}`)
          setTarget(null)
        }}
      />
    </Page>
  )
}

function AdjustModal({
  target,
  onClose,
  onSubmit,
}: {
  target: { inv: Inventory; product: Product } | null
  onClose: () => void
  onSubmit: (type: StockMovementType, change: number, reason: string) => void
}) {
  const [type, setType] = useState<StockMovementType>('stock_in')
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const sign = ADJUST_TYPES.find((t) => t.value === type)?.sign ?? 1
  const change = amount * sign
  const after = target ? Math.max(0, target.inv.quantity + change) : 0

  if (!target) return null

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      size="md"
      title="Penyesuaian Stok"
      subtitle={`${target.product.name} · stok saat ini ${target.inv.quantity} ${target.inv.unit}`}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button
            fullWidth
            onClick={() => {
              if (amount <= 0) return setError('Jumlah harus lebih dari nol.')
              if (reason.trim().length < 4) return setError('Alasan wajib diisi (minimal 4 karakter).')
              onSubmit(type, change, reason.trim())
              setAmount(0)
              setReason('')
              setError('')
            }}
          >
            Simpan Penyesuaian
          </Button>
        </div>
      }
    >
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Jenis pergerakan</p>
        <div className="grid grid-cols-2 gap-2.5">
          {ADJUST_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setType(t.value)
                setReason('')
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all active:scale-[.98]',
                type === t.value ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
              )}
            >
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', t.sign > 0 ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
                {t.sign > 0 ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
              </span>
              <span className={cn('text-[13px] font-bold', type === t.value ? 'text-brand-700' : 'text-ink-700')}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label={`Jumlah (${target.inv.unit})`}
        className="mt-4"
        inputMode="numeric"
        sizeVariant="lg"
        value={amount ? String(amount) : ''}
        onChange={(e) => {
          setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)
          setError('')
        }}
        placeholder="0"
        error={error && amount <= 0 ? error : undefined}
      />

      <div className="mt-2.5 flex flex-wrap gap-2">
        {[5, 10, 20, 50, 100].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[12.5px] font-bold tnum transition-colors',
              amount === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50',
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-100 p-4 text-center">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Sebelum</p>
          <p className="mt-0.5 text-[19px] figure text-ink-700">{target.inv.quantity}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Perubahan</p>
          <p className={cn('mt-0.5 text-[19px] figure', change > 0 ? 'text-success-600' : change < 0 ? 'text-danger-600' : 'text-ink-400')}>
            {change > 0 ? '+' : ''}
            {change}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Sesudah</p>
          <p className="mt-0.5 text-[19px] figure text-ink-900">{after}</p>
        </div>
      </div>

      <Textarea
        label="Alasan penyesuaian"
        className="mt-4"
        rows={2}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value)
          setError('')
        }}
        placeholder={`mis. ${REASONS[type][0]}`}
        error={error && amount > 0 ? error : undefined}
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        {REASONS[type].map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            + {r}
          </button>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-info-50 p-3 text-[12px] leading-relaxed text-info-700">
        Perubahan tercatat sebagai <b>{MOVEMENT_LABEL[type]}</b> pada riwayat pergerakan stok dan audit log.
      </p>
    </Modal>
  )
}
