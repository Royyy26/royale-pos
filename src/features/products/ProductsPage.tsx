import { useEffect, useMemo, useState } from 'react'
import { Boxes, Grid3x3, LayoutList, Pencil, Plus, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CurrencyInput, EmptyState, Input, SearchInput, SegmentedControl, Select, Switch, Table, Td, Textarea, Th } from '@/components/ui/primitives'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatIDR, formatPercent, uid } from '@/lib/utils'
import { StockStatusBadge, stockStatusOf } from '@/lib/labels'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Product } from '@/types'
import { Glyph, normalizeGlyphKey, PRODUCT_GLYPHS } from '@/lib/glyphs'

/** Tint kartu produk — mengikuti keluarga warna aplikasi, bukan pastel acak. */
const GRADIENTS = [
  'from-brand-100 to-brand-200/80',
  'from-info-50 to-info-100',
  'from-ink-150 to-brand-100',
  'from-plum-50 to-plum-100',
  'from-ink-100 to-ink-150',
  'from-success-50 to-success-100',
  'from-warning-50 to-warning-100',
  'from-danger-50 to-danger-100',
]


const empty = (): Product => ({
  id: uid('prod'),
  sku: '',
  barcode: null,
  name: '',
  description: '',
  category_id: 'cat_food',
  price: 0,
  cost_price: 0,
  emoji: 'rice',
  gradient: GRADIENTS[0],
  is_active: true,
  track_stock: true,
  has_recipe: false,
  prep_time_minutes: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export function ProductsPage({ readOnly = false }: { readOnly?: boolean }) {
  const db = useDataStore((s) => s.db)
  const saveProduct = useDataStore((s) => s.saveProduct)
  const deleteProduct = useDataStore((s) => s.deleteProduct)
  const user = useAuthStore((s) => s.user)!
  const has = useAuthStore((s) => s.has)
  const editable = !readOnly && has('product.manage')

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [view, setView] = useState<'grid' | 'table'>('table')
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const inventoryMap = useMemo(() => new Map(db.inventory.map((i) => [i.product_id, i])), [db.inventory])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.products
      .filter((p) => (category === 'all' ? true : p.category_id === category))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) : true))
  }, [db.products, category, query])

  const totalValue = filtered.reduce((a, p) => a + p.price * (inventoryMap.get(p.id)?.quantity ?? 0), 0)
  const avgMargin =
    filtered.length > 0
      ? filtered.reduce((a, p) => a + (p.price ? ((p.price - p.cost_price) / p.price) * 100 : 0), 0) / filtered.length
      : 0

  return (
    <Page
      title={readOnly ? 'Katalog Produk' : 'Manajemen Produk'}
      subtitle={`${filtered.length} produk ditampilkan`}
      actions={
        editable ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(empty())}>
            Tambah Produk
          </Button>
        ) : undefined
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Produk" value={db.products.length} tone="brand" compact icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Produk Aktif" value={db.products.filter((p) => p.is_active).length} tone="success" compact />
        <StatCard label="Nilai Jual Persediaan" value={formatIDR(totalValue)} tone="info" compact />
        <StatCard label="Rata-rata Margin" value={formatPercent(avgMargin)} tone="violet" compact />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama produk atau SKU…" />
          </div>
          <div className="w-48">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[{ value: 'all', label: 'Semua Kategori' }, ...db.categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: 'Tabel', icon: <LayoutList className="h-3.5 w-3.5" /> },
              { value: 'grid', label: 'Kartu', icon: <Grid3x3 className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes className="h-7 w-7" />}
            title="Produk tidak ditemukan"
            description="Sesuaikan kata kunci pencarian atau pilih kategori lain."
            action={editable ? <Button onClick={() => setEditing(empty())} leftIcon={<Plus className="h-4 w-4" />}>Tambah Produk</Button> : undefined}
          />
        </Card>
      ) : view === 'table' ? (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Produk</Th>
                <Th>SKU</Th>
                <Th>Kategori</Th>
                <Th align="right">Harga Jual</Th>
                <Th align="right">HPP</Th>
                <Th align="right">Margin</Th>
                <Th align="right">Stok</Th>
                <Th align="center">Status</Th>
                {editable && <Th align="center">Aksi</Th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const inv = inventoryMap.get(p.id)
                const cat = db.categories.find((c) => c.id === p.category_id)
                const margin = p.price ? ((p.price - p.cost_price) / p.price) * 100 : 0
                return (
                  <tr key={p.id} className="transition-colors hover:bg-ink-50/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-lg', p.gradient)}>
                          <Glyph name={p.emoji} className="h-5 w-5 text-ink-700" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink-900">{p.name}</p>
                          <p className="truncate text-[11.5px] text-ink-400">{p.prep_time_minutes} menit persiapan</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="tnum text-[12.5px] text-ink-500">{p.sku}</Td>
                    <Td className="text-[12.5px] text-ink-600">
                      {cat?.name}
                    </Td>
                    <Td align="right" className="figure text-ink-900">{formatIDR(p.price)}</Td>
                    <Td align="right" className="tnum text-ink-500">{formatIDR(p.cost_price)}</Td>
                    <Td align="right" className={cn('tnum font-semibold', margin >= 50 ? 'text-success-600' : margin >= 30 ? 'text-ink-700' : 'text-warning-600')}>
                      {formatPercent(margin)}
                    </Td>
                    <Td align="right" className="tnum font-semibold text-ink-800">
                      {inv ? `${inv.quantity} ${inv.unit}` : '—'}
                    </Td>
                    <Td align="center">
                      {inv ? <StockStatusBadge status={stockStatusOf(inv.quantity, inv.min_quantity)} /> : <Badge tone="neutral">Tidak dilacak</Badge>}
                    </Td>
                    {editable && (
                      <Td align="center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Ubah">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(p)} aria-label="Hapus" className="text-danger-500 hover:bg-danger-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((p) => {
            const inv = inventoryMap.get(p.id)
            return (
              <Card key={p.id} className="card-hover overflow-hidden">
                <div className={cn('relative grid h-24 place-items-center bg-gradient-to-br', p.gradient)}>
                  <Glyph name={p.emoji} className="h-11 w-11 text-ink-700" />
                  {!p.is_active && (
                    <span className="absolute left-2 top-2 rounded-md bg-ink-900/80 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-white">
                      Nonaktif
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="line-clamp-2 min-h-[34px] text-[13px] font-bold leading-tight text-ink-900">{p.name}</p>
                  <p className="mt-1 text-[11px] tnum text-ink-400">{p.sku}</p>
                  <p className="mt-2 text-[16px] figure text-brand-700">{formatIDR(p.price)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11.5px] tnum text-ink-500">{inv ? `${inv.quantity} ${inv.unit}` : '—'}</span>
                    {inv && <StockStatusBadge status={stockStatusOf(inv.quantity, inv.min_quantity)} />}
                  </div>
                  {editable && (
                    <div className="mt-3 flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(p)}>
                        Ubah
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-danger-500" onClick={() => setDeleting(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ProductFormModal
        product={editing}
        onClose={() => setEditing(null)}
        onSave={(p) => {
          saveProduct(p, user)
          setEditing(null)
          toast.success('Produk tersimpan', `${p.name} berhasil diperbarui.`)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteProduct(deleting.id, user)
          toast.warning('Produk dihapus', `${deleting.name} telah dihapus dari katalog.`)
          setDeleting(null)
        }}
        title="Hapus produk ini?"
        description={
          <>
            <b>{deleting?.name}</b> akan dihapus beserta data inventorinya. Riwayat transaksi lama tetap tersimpan.
          </>
        }
        confirmLabel="Ya, hapus"
      />
    </Page>
  )
}

/* ----------------------------- Form produk ------------------------------- */

function ProductFormModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null
  onClose: () => void
  onSave: (product: Product) => void
}) {
  const categories = useDataStore((s) => s.db.categories)
  const [form, setForm] = useState<Product | null>(product)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Data lama menyimpan emoji; normalkan agar pilihan ikon tetap tersorot.
    setForm(product && { ...product, emoji: normalizeGlyphKey(product.emoji, 'rice') })
    setErrors({})
  }, [product])

  if (!form) return null

  const set = <K extends keyof Product,>(key: K, value: Product[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const margin = form.price ? ((form.price - form.cost_price) / form.price) * 100 : 0

  const submit = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Nama produk wajib diisi.'
    if (!form.sku.trim()) next.sku = 'SKU wajib diisi.'
    if (form.price <= 0) next.price = 'Harga jual harus lebih dari nol.'
    if (form.cost_price > form.price) next.cost_price = 'HPP tidak boleh melebihi harga jual.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSave(form)
  }

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      size="lg"
      title={product?.name ? 'Ubah Produk' : 'Tambah Produk Baru'}
      subtitle="Data produk digunakan pada halaman POS, laporan, dan inventori."
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button fullWidth onClick={submit}>
            Simpan Produk
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nama produk" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} placeholder="mis. Nasi Goreng Kampung" />
        <Input label="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} error={errors.sku} placeholder="mis. FD-013" inputClassName="tnum" />
        <Select
          label="Kategori"
          value={form.category_id}
          onChange={(e) => set('category_id', e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Input
          label="Waktu persiapan (menit)"
          inputMode="numeric"
          value={String(form.prep_time_minutes)}
          onChange={(e) => set('prep_time_minutes', Number(e.target.value.replace(/\D/g, '')) || 0)}
          inputClassName="tnum"
        />
        <CurrencyInput label="Harga jual" value={form.price} onValueChange={(v) => set('price', v)} error={errors.price} />
        <CurrencyInput label="Harga pokok (HPP)" value={form.cost_price} onValueChange={(v) => set('cost_price', v)} error={errors.cost_price} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-100 px-4 py-3">
        <span className="text-[13px] font-semibold text-ink-600">Margin kotor</span>
        <span className={cn('text-[17px] figure', margin >= 50 ? 'text-success-600' : margin >= 30 ? 'text-ink-900' : 'text-warning-600')}>
          {formatPercent(margin)} · {formatIDR(form.price - form.cost_price)}
        </span>
      </div>

      <Textarea label="Deskripsi" className="mt-4" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Deskripsi singkat menu…" />

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Ikon produk</p>
        <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
          {PRODUCT_GLYPHS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => set('emoji', key)}
              title={label}
              aria-label={label}
              aria-pressed={form.emoji === key}
              className={cn(
                'grid h-11 w-full place-items-center rounded-xl border-2 transition-all active:scale-95',
                form.emoji === key
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-700',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Warna kartu</p>
        <div className="flex flex-wrap gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              onClick={() => set('gradient', g)}
              className={cn(
                'h-11 w-16 rounded-xl border-2 bg-gradient-to-br transition-all active:scale-95',
                g,
                form.gradient === g ? 'border-ink-900 ring-2 ring-ink-900/10' : 'border-ink-200',
              )}
              aria-label="Pilih warna"
            />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-ink-200 p-4">
        <Switch checked={form.is_active} onChange={(v) => set('is_active', v)} label="Produk aktif" description="Hanya produk aktif yang tampil di halaman POS." />
        <Switch checked={form.track_stock} onChange={(v) => set('track_stock', v)} label="Lacak stok" description="Stok otomatis berkurang setiap terjadi penjualan." />
        <Switch
          checked={form.has_recipe}
          onChange={(v) => set('has_recipe', v)}
          label="Gunakan resep (BOM)"
          description="Disiapkan untuk pengembangan: pengurangan bahan baku per porsi."
          disabled
        />
      </div>
    </Modal>
  )
}
