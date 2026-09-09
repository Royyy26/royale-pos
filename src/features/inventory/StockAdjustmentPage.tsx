import { useMemo, useState } from 'react'
import { Check, ClipboardCheck, Plus, X } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, Input, SegmentedControl, Select, Table, Td, Textarea, Th } from '@/components/ui/primitives'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatDateTime } from '@/lib/utils'
import { AdjustmentBadge } from '@/lib/labels'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { AdjustmentStatus } from '@/types'
import { Glyph } from '@/lib/glyphs'

export function StockAdjustmentPage() {
  const db = useDataStore((s) => s.db)
  const submitOpname = useDataStore((s) => s.submitOpname)
  const reviewAdjustment = useDataStore((s) => s.reviewAdjustment)
  const user = useAuthStore((s) => s.user)!
  const canApprove = user.role_id === 'owner'

  const [filter, setFilter] = useState<AdjustmentStatus | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [productId, setProductId] = useState(db.products[0]?.id ?? '')
  const [counted, setCounted] = useState(0)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [review, setReview] = useState<{ id: string; approve: boolean } | null>(null)

  const productMap = useMemo(() => new Map(db.products.map((p) => [p.id, p])), [db.products])
  const invMap = useMemo(() => new Map(db.inventory.map((i) => [i.product_id, i])), [db.inventory])

  const rows = useMemo(
    () => db.stock_adjustments.filter((a) => (filter === 'all' ? true : a.status === filter)),
    [db.stock_adjustments, filter],
  )

  const counts = {
    pending: db.stock_adjustments.filter((a) => a.status === 'pending').length,
    approved: db.stock_adjustments.filter((a) => a.status === 'approved').length,
    rejected: db.stock_adjustments.filter((a) => a.status === 'rejected').length,
  }

  const currentStock = invMap.get(productId)?.quantity ?? 0
  const difference = counted - currentStock

  const submit = () => {
    if (!productId) return setError('Pilih produk terlebih dahulu.')
    if (reason.trim().length < 4) return setError('Alasan wajib diisi (minimal 4 karakter).')
    if (counted === currentStock) return setError('Jumlah hasil hitung sama dengan sistem — tidak perlu penyesuaian.')
    submitOpname(productId, counted, reason.trim(), user)
    setFormOpen(false)
    setCounted(0)
    setReason('')
    setError('')
    toast.success('Pengajuan dikirim', 'Penyesuaian menunggu persetujuan owner.')
  }

  return (
    <Page
      title="Penyesuaian Stok"
      subtitle="Pengajuan koreksi stok dan status persetujuannya"
      actions={
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
          Ajukan Penyesuaian
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Menunggu Persetujuan" value={counts.pending} tone={counts.pending ? 'warning' : 'neutral'} compact icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="Disetujui" value={counts.approved} tone="success" compact />
        <StatCard label="Ditolak" value={counts.rejected} tone="danger" compact />
      </div>

      <div className="mb-4">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Semua' },
            { value: 'pending', label: `Menunggu (${counts.pending})` },
            { value: 'approved', label: 'Disetujui' },
            { value: 'rejected', label: 'Ditolak' },
          ]}
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-7 w-7" />}
            title="Tidak ada pengajuan"
            description="Belum ada penyesuaian stok pada status ini."
            action={<Button onClick={() => setFormOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Ajukan Penyesuaian</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Diajukan</Th>
                <Th>Produk</Th>
                <Th align="right">Sistem</Th>
                <Th align="right">Hasil Hitung</Th>
                <Th align="right">Selisih</Th>
                <Th>Alasan</Th>
                <Th>Pengaju</Th>
                <Th align="center">Status</Th>
                {canApprove && <Th align="center">Aksi</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const product = productMap.get(a.product_id)
                return (
                  <tr key={a.id} className="transition-colors hover:bg-ink-50/60">
                    <Td className="whitespace-nowrap text-[12.5px] text-ink-600">{formatDateTime(a.created_at)}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100"><Glyph name={product?.emoji} className="h-4 w-4 text-ink-600" /></span>
                        <span className="text-[13px] font-semibold text-ink-900">{product?.name ?? a.product_id}</span>
                      </div>
                    </Td>
                    <Td align="right" className="tnum text-ink-600">{a.system_quantity}</Td>
                    <Td align="right" className="tnum font-semibold text-ink-900">{a.counted_quantity}</Td>
                    <Td align="right" className={cn('figure', a.difference > 0 ? 'text-success-600' : 'text-danger-600')}>
                      {a.difference > 0 ? '+' : ''}
                      {a.difference}
                    </Td>
                    <Td className="max-w-[220px] truncate text-[12.5px] text-ink-600">{a.reason}</Td>
                    <Td className="whitespace-nowrap text-[12.5px] text-ink-600">{a.requested_by_name}</Td>
                    <Td align="center">
                      <AdjustmentBadge status={a.status} />
                    </Td>
                    {canApprove && (
                      <Td align="center">
                        {a.status === 'pending' ? (
                          <div className="flex justify-center gap-1.5">
                            <Button variant="success" size="sm" leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => setReview({ id: a.id, approve: true })}>
                              Setuju
                            </Button>
                            <Button variant="danger-soft" size="sm" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => setReview({ id: a.id, approve: false })}>
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[12px] text-ink-400">Ditinjau</span>
                        )}
                      </Td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Form pengajuan */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="md"
        title="Ajukan Penyesuaian Stok"
        subtitle="Digunakan bila hasil perhitungan fisik berbeda dengan catatan sistem."
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button fullWidth onClick={submit}>
              Kirim Pengajuan
            </Button>
          </div>
        }
      >
        <Select
          label="Produk"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value)
            setCounted(invMap.get(e.target.value)?.quantity ?? 0)
            setError('')
          }}
          options={db.products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
        />

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-100 p-4 text-center">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Sistem</p>
            <p className="mt-0.5 text-[19px] figure text-ink-700">{currentStock}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Hasil Hitung</p>
            <p className="mt-0.5 text-[19px] figure text-ink-900">{counted}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Selisih</p>
            <p className={cn('mt-0.5 text-[19px] figure', difference > 0 ? 'text-success-600' : difference < 0 ? 'text-danger-600' : 'text-ink-400')}>
              {difference > 0 ? '+' : ''}
              {difference}
            </p>
          </div>
        </div>

        <Input
          label="Jumlah hasil perhitungan fisik"
          className="mt-4"
          inputMode="numeric"
          sizeVariant="lg"
          value={String(counted)}
          onChange={(e) => {
            setCounted(Number(e.target.value.replace(/\D/g, '')) || 0)
            setError('')
          }}
        />

        <Textarea
          label="Alasan penyesuaian"
          className="mt-4"
          rows={2}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setError('')
          }}
          placeholder="mis. selisih hasil opname bulanan"
          error={error || undefined}
        />
        <div className="mt-2.5 flex flex-wrap gap-2">
          {['Selisih hasil opname', 'Barang rusak belum tercatat', 'Kesalahan input penerimaan', 'Sample untuk tasting'].map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              + {r}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!review}
        onClose={() => setReview(null)}
        onConfirm={() => {
          if (!review) return
          reviewAdjustment(review.id, review.approve, user)
          toast[review.approve ? 'success' : 'warning'](
            review.approve ? 'Penyesuaian disetujui' : 'Penyesuaian ditolak',
            review.approve ? 'Stok sistem telah diperbarui.' : 'Stok sistem tidak diubah.',
          )
          setReview(null)
        }}
        title={review?.approve ? 'Setujui penyesuaian stok?' : 'Tolak penyesuaian stok?'}
        description={
          review?.approve
            ? 'Stok sistem akan disesuaikan mengikuti hasil perhitungan fisik dan tercatat pada pergerakan stok.'
            : 'Pengajuan akan ditandai ditolak dan stok sistem tetap seperti semula.'
        }
        confirmLabel={review?.approve ? 'Ya, setujui' : 'Ya, tolak'}
        tone={review?.approve ? 'primary' : 'danger'}
      />
    </Page>
  )
}
