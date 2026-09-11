import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, Save, ScanLine, Undo2 } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, SearchInput, Select, Table, Td, Textarea, Th } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatDateTime, formatIDR } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

/**
 * Stok opname: kasir gudang mencatat hasil perhitungan fisik seluruh item,
 * lalu mengirimkan selisihnya sebagai pengajuan penyesuaian.
 */
export function StockOpnamePage() {
  const db = useDataStore((s) => s.db)
  const submitOpname = useDataStore((s) => s.submitOpname)
  const user = useAuthStore((s) => s.user)!

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [note, setNote] = useState('Stok opname rutin')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const productMap = useMemo(() => new Map(db.products.map((p) => [p.id, p])), [db.products])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.inventory
      .map((inv) => ({ inv, product: productMap.get(inv.product_id)! }))
      .filter((r) => r.product)
      .filter((r) => (category === 'all' ? true : r.product.category_id === category))
      .filter((r) => (q ? r.product.name.toLowerCase().includes(q) || r.product.sku.toLowerCase().includes(q) : true))
      .sort((a, b) => a.product.name.localeCompare(b.product.name))
  }, [db.inventory, productMap, category, query])

  const counted = rows.filter((r) => counts[r.inv.product_id] !== undefined && counts[r.inv.product_id] !== '')
  const withDifference = counted.filter((r) => Number(counts[r.inv.product_id]) !== r.inv.quantity)
  const valueImpact = withDifference.reduce(
    (a, r) => a + (Number(counts[r.inv.product_id]) - r.inv.quantity) * r.product.cost_price,
    0,
  )

  const submit = () => {
    setSaving(true)
    setTimeout(() => {
      for (const r of withDifference) {
        submitOpname(r.inv.product_id, Number(counts[r.inv.product_id]), note.trim() || 'Stok opname', user)
      }
      setSaving(false)
      setConfirmOpen(false)
      setCounts({})
      toast.success('Opname terkirim', `${withDifference.length} pengajuan penyesuaian menunggu persetujuan owner.`)
    }, 700)
  }

  return (
    <Page
      title="Stok Opname"
      subtitle={`${counted.length} dari ${rows.length} item telah dihitung`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => setCounts({})} disabled={counted.length === 0}>
            Bersihkan
          </Button>
          <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => setConfirmOpen(true)} disabled={withDifference.length === 0}>
            Kirim Hasil ({withDifference.length})
          </Button>
        </div>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Item Dihitung" value={`${counted.length} / ${rows.length}`} tone="brand" compact icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="Item Sesuai" value={counted.length - withDifference.length} tone="success" compact icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Item Selisih" value={withDifference.length} tone={withDifference.length ? 'danger' : 'neutral'} compact />
        <StatCard
          label="Dampak Nilai (HPP)"
          value={`${valueImpact > 0 ? '+' : ''}${formatIDR(valueImpact)}`}
          tone={valueImpact === 0 ? 'neutral' : valueImpact > 0 ? 'info' : 'danger'}
          compact
        />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk atau SKU..." />
          </div>
          <div className="w-52">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[{ value: 'all', label: 'Semua Kategori' }, ...db.categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <Button
            variant="outline"
            leftIcon={<ScanLine className="h-4 w-4" />}
            onClick={() => {
              const next: Record<string, string> = { ...counts }
              for (const r of rows) next[r.inv.product_id] = String(r.inv.quantity)
              setCounts(next)
              toast.info('Diisi sesuai sistem', 'Sesuaikan hanya item yang berbeda dari perhitungan fisik.')
            }}
          >
            Isi Sesuai Sistem
          </Button>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Tidak ada item" description="Sesuaikan filter untuk menampilkan item." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Produk</Th>
                <Th>Lokasi</Th>
                <Th align="right">Stok Sistem</Th>
                <Th align="center">Hasil Hitung Fisik</Th>
                <Th align="right">Selisih</Th>
                <Th align="right">Dampak Nilai</Th>
                <Th align="right">Opname Terakhir</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, product }) => {
                const raw = counts[inv.product_id]
                const has = raw !== undefined && raw !== ''
                const value = has ? Number(raw) : 0
                const diff = has ? value - inv.quantity : 0
                return (
                  <tr key={inv.id} className={cn('transition-colors', has && diff !== 0 ? 'bg-warning-50/40' : 'hover:bg-ink-50/60')}>
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
                    <Td align="right" className="tnum font-semibold text-ink-700">
                      {inv.quantity} <span className="text-[11px] text-ink-400">{inv.unit}</span>
                    </Td>
                    <Td align="center">
                      <input
                        inputMode="numeric"
                        value={raw ?? ''}
                        onChange={(e) => setCounts((c) => ({ ...c, [inv.product_id]: e.target.value.replace(/\D/g, '') }))}
                        placeholder="-"
                        className={cn(
                          'h-10 w-24 rounded-xl border text-center text-[14px] font-bold tnum outline-none transition-colors',
                          has
                            ? diff === 0
                              ? 'border-success-500 bg-success-50 text-success-700'
                              : 'border-warning-500 bg-warning-50 text-warning-700'
                            : 'border-ink-300 text-ink-800 focus:border-brand-500',
                        )}
                      />
                    </Td>
                    <Td align="right" className={cn('figure', !has ? 'text-ink-300' : diff === 0 ? 'text-success-600' : diff > 0 ? 'text-info-600' : 'text-danger-600')}>
                      {has ? `${diff > 0 ? '+' : ''}${diff}` : '-'}
                    </Td>
                    <Td align="right" className={cn('tnum', !has || diff === 0 ? 'text-ink-400' : diff > 0 ? 'text-info-600' : 'text-danger-600')}>
                      {has && diff !== 0 ? `${diff > 0 ? '+' : ''}${formatIDR(diff * product.cost_price)}` : '-'}
                    </Td>
                    <Td align="right" className="text-[12px] text-ink-500">
                      {inv.last_counted_at ? formatDateTime(inv.last_counted_at) : '-'}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
        loading={saving}
        title="Kirim hasil stok opname?"
        tone="primary"
        confirmLabel="Ya, kirim"
        description={
          <>
            <b>{withDifference.length}</b> item memiliki selisih dan akan diajukan sebagai penyesuaian stok untuk
            disetujui owner. Dampak nilai persediaan{' '}
            <b className="tnum">
              {valueImpact > 0 ? '+' : ''}
              {formatIDR(valueImpact)}
            </b>
            .
          </>
        }
      >
        <Textarea label="Catatan opname" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. stok opname akhir bulan" />
      </ConfirmDialog>
    </Page>
  )
}
