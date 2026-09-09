import { useEffect, useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, Input, Switch } from '@/components/ui/primitives'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { cn, formatIDR, uid } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Category } from '@/types'
import { CATEGORY_GLYPHS, Glyph, normalizeGlyphKey } from '@/lib/glyphs'


const empty = (order: number): Category => ({
  id: uid('cat'),
  name: '',
  slug: '',
  icon: 'food',
  color: 'slate',
  sort_order: order,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export function CategoriesPage() {
  const db = useDataStore((s) => s.db)
  const saveCategory = useDataStore((s) => s.saveCategory)
  const deleteCategory = useDataStore((s) => s.deleteCategory)
  const user = useAuthStore((s) => s.user)!

  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const sorted = [...db.categories].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Page
      title="Kategori Menu"
      subtitle={`${db.categories.length} kategori · menentukan tab pada halaman POS`}
      actions={
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(empty(db.categories.length + 1))}>
          Tambah Kategori
        </Button>
      }
    >
      {sorted.length === 0 ? (
        <Card>
          <EmptyState icon={<Tags className="h-7 w-7" />} title="Belum ada kategori" description="Tambahkan kategori untuk mengelompokkan menu." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((c) => {
            const products = db.products.filter((p) => p.category_id === c.id)
            const value = products.reduce((a, p) => {
              const inv = db.inventory.find((i) => i.product_id === p.id)
              return a + p.price * (inv?.quantity ?? 0)
            }, 0)
            return (
              <Card key={c.id} className="card-hover p-5">
                <div className="flex items-start justify-between">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-700"><Glyph name={c.icon} className="h-7 w-7" /></span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label="Ubah">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger-500 hover:bg-danger-50"
                      onClick={() => setDeleting(c)}
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="mt-4 text-[16px] font-bold text-ink-900">{c.name}</h3>
                <p className="text-[12px] text-ink-400">/{c.slug}</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-ink-100 p-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Produk</p>
                    <p className="mt-0.5 text-[18px] figure text-ink-900">{products.length}</p>
                  </div>
                  <div className="rounded-xl bg-ink-100 p-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Nilai Stok</p>
                    <p className="mt-0.5 truncate text-[14px] figure text-ink-900">{formatIDR(value)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                      c.is_active ? 'bg-success-50 text-success-700 ring-success-100' : 'bg-ink-100 text-ink-500 ring-ink-200',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {c.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="text-[11.5px] text-ink-400">Urutan {c.sort_order}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <CategoryFormModal
        category={editing}
        onClose={() => setEditing(null)}
        onSave={(c) => {
          saveCategory(c, user)
          setEditing(null)
          toast.success('Kategori tersimpan', `${c.name} berhasil diperbarui.`)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          const count = db.products.filter((p) => p.category_id === deleting.id).length
          if (count > 0) {
            toast.error('Kategori masih dipakai', `${count} produk masih menggunakan kategori ini. Pindahkan terlebih dahulu.`)
            setDeleting(null)
            return
          }
          deleteCategory(deleting.id, user)
          toast.warning('Kategori dihapus')
          setDeleting(null)
        }}
        title="Hapus kategori ini?"
        description={<>Kategori <b>{deleting?.name}</b> akan dihapus. Pastikan tidak ada produk yang masih menggunakannya.</>}
        confirmLabel="Ya, hapus"
      />
    </Page>
  )
}

function CategoryFormModal({
  category,
  onClose,
  onSave,
}: {
  category: Category | null
  onClose: () => void
  onSave: (category: Category) => void
}) {
  const [form, setForm] = useState<Category | null>(category)
  const [error, setError] = useState('')

  useEffect(() => {
    // Data lama menyimpan emoji; normalkan agar pilihan ikon tetap tersorot.
    setForm(category && { ...category, icon: normalizeGlyphKey(category.icon, 'food') })
    setError('')
  }, [category])

  if (!form) return null

  const set = <K extends keyof Category,>(key: K, value: Category[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  return (
    <Modal
      open={!!category}
      onClose={onClose}
      size="md"
      title={category?.name ? 'Ubah Kategori' : 'Tambah Kategori'}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button
            fullWidth
            onClick={() => {
              if (!form.name.trim()) return setError('Nama kategori wajib diisi.')
              onSave({ ...form, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-') })
            }}
          >
            Simpan
          </Button>
        </div>
      }
    >
      <Input label="Nama kategori" value={form.name} onChange={(e) => set('name', e.target.value)} error={error} placeholder="mis. Minuman Dingin" autoFocus />
      <Input
        label="Slug"
        className="mt-4"
        value={form.slug}
        onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
        placeholder="otomatis dari nama"
        hint="Dipakai sebagai pengenal internal kategori."
      />
      <Input
        label="Urutan tampil"
        className="mt-4"
        inputMode="numeric"
        value={String(form.sort_order)}
        onChange={(e) => set('sort_order', Number(e.target.value.replace(/\D/g, '')) || 0)}
      />

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Ikon kategori</p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {CATEGORY_GLYPHS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => set('icon', key)}
              title={label}
              aria-label={label}
              aria-pressed={form.icon === key}
              className={cn(
                'grid h-11 w-full place-items-center rounded-xl border-2 transition-all active:scale-95',
                form.icon === key
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-700',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-ink-200 p-4">
        <Switch checked={form.is_active} onChange={(v) => set('is_active', v)} label="Kategori aktif" description="Kategori nonaktif tidak tampil sebagai tab pada halaman POS." />
      </div>
    </Modal>
  )
}
