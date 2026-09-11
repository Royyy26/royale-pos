import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Bike,
  ChefHat,
  CircleAlert,
  Keyboard,
  LayoutGrid,
  Minus,
  NotebookPen,
  Percent,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Save,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Page } from '@/components/layout/Page'
import { EASE_OUT, springSnappy } from '@/components/ui/motion'
import { Button } from '@/components/ui/Button'
import { Badge, EmptyState, Input, SearchInput, Textarea } from '@/components/ui/primitives'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { cn, formatIDR, formatNumber } from '@/lib/utils'
import { stockStatusOf, TABLE_STATUS_LABEL } from '@/lib/labels'
import { TABLE_TONE, allTableStates, billForTable } from '@/lib/tables'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore, type DiscountMode } from '@/store/useCartStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { OrderType, Product } from '@/types'
import { CheckoutDialog } from './CheckoutDialog'
import { Glyph } from '@/lib/glyphs'

const ORDER_TYPES: { value: OrderType; label: string; icon: typeof Utensils }[] = [
  { value: 'dine_in', label: 'Dine In', icon: Utensils },
  { value: 'take_away', label: 'Take Away', icon: ShoppingBag },
  { value: 'delivery', label: 'Delivery', icon: Bike },
]

export function POSPage() {
  const user = useAuthStore((s) => s.user)!
  const has = useAuthStore((s) => s.has)
  const db = useDataStore((s) => s.db)
  const cart = useCartStore()

  const [categoryId, setCategoryId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [noteItemId, setNoteItemId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [discountOpen, setDiscountOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearReason, setClearReason] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const totals = cart.totals(db.settings)
  const saveBill = useDataStore((s) => s.saveBill)
  const cancelBill = useDataStore((s) => s.cancelBill)

  /** Bill terbuka yang sedang diedit, bila ada. */
  const activeBill = cart.activeBillId ? db.orders.find((o) => o.id === cart.activeBillId) ?? null : null

  const inventoryMap = useMemo(
    () => new Map(db.inventory.map((i) => [i.product_id, i])),
    [db.inventory],
  )

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.products
      .filter((p) => p.is_active)
      .filter((p) => (categoryId === 'all' ? true : p.category_id === categoryId))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) : true))
  }, [db.products, categoryId, query])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: db.products.filter((p) => p.is_active).length }
    for (const c of db.categories) map[c.id] = db.products.filter((p) => p.is_active && p.category_id === c.id).length
    return map
  }, [db.products, db.categories])

  /* ---------------------------- Pintasan papan ketik --------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'F4') {
        e.preventDefault()
        if (cart.items.length) setCheckoutOpen(true)
      }
      if (e.key === 'F8') {
        e.preventDefault()
        // Bill meja tidak dikosongkan lewat pintasan, hanya dilepas dari keranjang.
        if (cart.activeBillId) cart.clear()
        else if (cart.items.length) setClearOpen(true)
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('')
        searchRef.current?.blur()
      }
      if (e.key === '?' && e.shiftKey && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cart.items.length, cart.activeBillId])

  const addProduct = (product: Product) => {
    const inv = inventoryMap.get(product.id)
    if (product.track_stock && inv && inv.quantity <= 0) {
      toast.warning('Stok habis', `${product.name} sedang tidak tersedia.`)
      return
    }
    const inCart = cart.items.filter((i) => i.product_id === product.id).reduce((a, i) => a + i.quantity, 0)
    if (product.track_stock && inv && inCart + 1 > inv.quantity) {
      toast.warning('Melebihi stok', `Sisa stok ${product.name} hanya ${inv.quantity}.`)
      return
    }
    cart.add(product)
  }

  const openNote = (itemId: string, current: string) => {
    setNoteItemId(itemId)
    setNoteDraft(current)
  }

  const canProceed = cart.items.length > 0 && (cart.orderType !== 'dine_in' || !!cart.tableId)

  const checkoutPayload = canProceed
    ? {
        type: cart.orderType,
        tableId: cart.tableId,
        tableName: cart.tableName,
        customerName: cart.customerName,
        guestCount: cart.guestCount,
        items: cart.items,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        discountNote: cart.discountNote,
        taxAmount: totals.taxAmount,
        serviceAmount: totals.serviceAmount,
        total: totals.total,
        note: cart.note,
        cashier: user,
        billId: cart.activeBillId,
      }
    : null

  return (
    <Page
      title="Kasir / POS"
      subtitle={`${products.length} menu tersedia · Tekan F2 untuk mencari`}
      bleed
      actions={
        <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen(true)} aria-label="Pintasan keyboard">
          <Keyboard className="h-[18px] w-[18px]" />
        </Button>
      }
    >
      <div className="flex flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
        {/* ------------------------------ Katalog ------------------------------ */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-ink-200 lg:border-b-0 lg:border-r">
          <div className="shrink-0 space-y-3 bg-white px-4 py-4 lg:px-5">
            <SearchInput
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari menu atau SKU... (F2)"
            />

            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CategoryChip
                active={categoryId === 'all'}
                onClick={() => setCategoryId('all')}
                icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
                label="Semua"
                count={counts.all}
              />
              {db.categories
                .filter((c) => c.is_active)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <CategoryChip
                    key={c.id}
                    active={categoryId === c.id}
                    onClick={() => setCategoryId(c.id)}
                    icon={<Glyph name={c.icon} className="h-4 w-4" />}
                    label={c.name}
                    count={counts[c.id] ?? 0}
                  />
                ))}
            </div>
          </div>

          <div className="scroll-area min-h-0 flex-1 px-4 pb-6 lg:overflow-y-auto lg:px-5">
            {products.length === 0 ? (
              <EmptyState
                icon={<ChefHat className="h-7 w-7" />}
                title="Menu tidak ditemukan"
                description={
                  query
                    ? `Tidak ada menu yang cocok dengan "${query}". Coba kata kunci lain atau pilih kategori berbeda.`
                    : 'Belum ada menu aktif pada kategori ini.'
                }
                action={
                  query ? (
                    <Button variant="outline" onClick={() => setQuery('')}>
                      Bersihkan pencarian
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {products.map((product) => {
                  const inv = inventoryMap.get(product.id)
                  const status = inv ? stockStatusOf(inv.quantity, inv.min_quantity) : 'normal'
                  const inCart = cart.items
                    .filter((i) => i.product_id === product.id)
                    .reduce((a, i) => a + i.quantity, 0)
                  const soldOut = product.track_stock && inv ? inv.quantity <= 0 : false

                  return (
                    <motion.button
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.26, ease: EASE_OUT }}
                      whileTap={soldOut ? undefined : { scale: 0.965 }}
                      whileHover={soldOut ? undefined : { y: -3 }}
                      onClick={() => addProduct(product)}
                      disabled={soldOut}
                      className={cn(
                        'group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left',
                        soldOut
                          ? 'cursor-not-allowed border-ink-200 opacity-50'
                          : 'border-ink-200 shadow-tile hover:border-brand-400 hover:shadow-elev',
                      )}
                    >
                      <div className={cn('relative grid h-[86px] place-items-center bg-gradient-to-br', product.gradient)}>
                        <span className="text-[38px] drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                          <Glyph name={product.emoji} className="h-9 w-9 text-ink-700" />
                        </span>

                        <AnimatePresence>
                          {inCart > 0 && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={springSnappy}
                              className="absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-ink-900 px-1.5 text-[11px] font-bold text-brand-300 shadow-md"
                            >
                              {inCart}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {status !== 'normal' && (
                          <span
                            className={cn(
                              'absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]',
                              status === 'out' && 'bg-danger-600 text-white',
                              status === 'critical' && 'bg-warning-600 text-white',
                              status === 'low' && 'bg-warning-500 text-white',
                            )}
                          >
                            {status === 'out' ? 'Habis' : status === 'critical' ? 'Kritis' : 'Menipis'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-tight text-ink-900">
                          {product.name}
                        </p>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
                          <span className="figure text-[15px] text-ink-900">{formatIDR(product.price)}</span>
                          {inv && (
                            <span className="text-[10.5px] tnum text-ink-400">
                              {inv.quantity} {inv.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {!soldOut && (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-brand-500 transition-transform duration-300 group-hover:scale-x-100" />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------- Keranjang --------------------------- */}
        <aside className="flex w-full shrink-0 flex-col bg-white lg:w-[340px] xl:w-[400px] 2xl:w-[440px]">
          {/* Tipe pesanan */}
          <div className="shrink-0 border-b border-ink-200 px-4 py-3.5">
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map((t) => {
                const Icon = t.icon
                const active = cart.orderType === t.value
                /*
                 * Bill sudah terikat pada satu meja. Bila tipe boleh diganti,
                 * bill tetap `pending` sementara keranjang kehilangan mejanya -
                 * meja itu tidak akan pernah dibebaskan lagi.
                 */
                const locked = !!activeBill && t.value !== cart.orderType
                return (
                  <button
                    key={t.value}
                    disabled={locked}
                    onClick={() => cart.setOrderType(t.value)}
                    title={locked ? 'Tutup atau bayar bill meja ini dulu untuk mengganti tipe pesanan' : undefined}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 transition-all',
                      locked
                        ? 'cursor-not-allowed border-ink-200 text-ink-300 opacity-60'
                        : 'active:scale-[.97]',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : !locked && 'border-ink-200 text-ink-500 hover:border-ink-300 hover:bg-ink-50',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    <span className="text-[11.5px] font-bold">{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {cart.orderType === 'dine_in' ? (
                <button
                  onClick={() => setTableOpen(true)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    cart.tableId ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
                  )}
                >
                  <Utensils className={cn('h-4 w-4 shrink-0', cart.tableId ? 'text-brand-600' : 'text-ink-400')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">Meja</span>
                    <span className={cn('block truncate text-[13px] font-bold', cart.tableId ? 'text-brand-700' : 'text-ink-500')}>
                      {cart.tableName ?? 'Pilih meja'}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5">
                  <Users className="h-4 w-4 shrink-0 text-ink-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">Tipe</span>
                    <span className="block truncate text-[13px] font-bold text-ink-700">
                      {ORDER_TYPES.find((t) => t.value === cart.orderType)?.label}
                    </span>
                  </span>
                </div>
              )}

              <input
                value={cart.customerName}
                onChange={(e) => cart.setCustomerName(e.target.value)}
                placeholder="Nama pelanggan"
                aria-label="Nama pelanggan"
                className="rounded-xl border border-ink-200 px-3 py-2.5 text-[13px] font-semibold text-ink-800 outline-none placeholder:font-normal placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            {/* Jumlah tamu ikut tersimpan pada bill meja. */}
            {cart.orderType === 'dine_in' && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2">
                <Users className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span className="flex-1 text-[12px] font-semibold text-ink-600">Jumlah tamu</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cart.setGuestCount(cart.guestCount - 1)}
                    disabled={cart.guestCount <= 1}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 active:scale-95"
                    aria-label="Kurangi jumlah tamu"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-[13px] font-bold tnum text-ink-900" aria-live="polite">
                    {cart.guestCount}
                  </span>
                  <button
                    onClick={() => cart.setGuestCount(cart.guestCount + 1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 active:scale-95"
                    aria-label="Tambah jumlah tamu"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Header keranjang */}
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-[18px] w-[18px] text-ink-500" />
              <h2 className="font-display text-[14.5px] font-bold tracking-[-0.02em] text-ink-900">
                {activeBill ? 'Bill Meja' : 'Keranjang'}
              </h2>
              {totals.itemCount > 0 && (
                <Badge tone="brand">{totals.itemCount} item</Badge>
              )}
            </div>
            {activeBill ? (
              /*
               * Bill tetap terbuka di meja, ini hanya melepaskannya dari
               * keranjang. Memakai label "Batalkan" di sini menyesatkan.
               */
              <button
                onClick={() => {
                  // Bill yang belum berisi apa pun tidak boleh ditinggalkan: mejanya
                  // akan tersangkut "terisi Rp 0" tanpa cara membebaskannya dari UI.
                  const kosong = activeBill !== null && activeBill.items.length === 0
                  if (kosong) {
                    cancelBill(activeBill.id, 'Bill dibatalkan sebelum ada pesanan', user)
                    cart.clear()
                    toast.info('Bill ditutup', `${activeBill.table_name} kembali tersedia karena belum ada pesanan.`)
                    return
                  }
                  cart.clear()
                  toast.info('Bill dilepas', 'Perubahan yang belum disimpan dibuang. Bill tetap terbuka di mejanya.')
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-ink-600 transition-colors hover:bg-ink-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Tutup Bill
              </button>
            ) : (
              cart.items.length > 0 && (
                <button
                  onClick={() => setClearOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-danger-600 transition-colors hover:bg-danger-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Kosongkan
                </button>
              )
            )}
          </div>

          {/* Daftar item */}
          <div className="scroll-area min-h-0 flex-1 px-4 lg:overflow-y-auto">
            {cart.items.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="h-7 w-7" />}
                title="Keranjang masih kosong"
                description="Pilih menu di sebelah kiri untuk memulai pesanan pelanggan."
                className="py-12"
              />
            ) : (
              <ul className="space-y-2 pb-2">
                <AnimatePresence initial={false}>
                {cart.items.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    transition={springSnappy}
                    className="overflow-hidden rounded-2xl border border-ink-200 bg-white p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-lg">
                        <Glyph name={item.emoji} className="h-4 w-4 text-ink-600" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold leading-tight text-ink-900">{item.product_name}</p>
                        <p className="mt-0.5 text-[12px] tnum text-ink-500">{formatIDR(item.price)} / porsi</p>
                        {item.note && (
                          <p className="mt-1 truncate rounded-md bg-warning-50 px-1.5 py-0.5 text-[11px] font-medium text-warning-700">
                            {item.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => cart.remove(item.id)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-danger-50 hover:text-danger-600"
                        aria-label={`Hapus ${item.product_name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cart.decrease(item.id)}
                          className="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 active:scale-95"
                          aria-label={`Kurangi ${item.product_name}`}
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <input
                          value={item.quantity}
                          onChange={(e) => {
                            const v = Number(e.target.value.replace(/\D/g, ''))
                            cart.setQuantity(item.id, Number.isNaN(v) ? 1 : v)
                          }}
                          aria-label={`Jumlah ${item.product_name}`}
                          className="h-10 w-12 rounded-lg border border-ink-200 text-center text-[13.5px] font-bold tnum text-ink-900 outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={() => cart.increase(item.id)}
                          className="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 active:scale-95"
                          aria-label={`Tambah ${item.product_name}`}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => openNote(item.id, item.note)}
                          className={cn(
                            'ml-1 grid h-10 w-10 place-items-center rounded-lg border transition-colors active:scale-95',
                            item.note
                              ? 'border-warning-200 bg-warning-50 text-warning-600'
                              : 'border-ink-200 text-ink-400 hover:bg-ink-100 hover:text-ink-600',
                          )}
                          aria-label={`Catatan untuk ${item.product_name}`}
                        >
                          <NotebookPen className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="figure text-[15px] text-ink-900">{formatIDR(item.subtotal)}</span>
                    </div>
                  </motion.li>
                ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {/* Ringkasan & aksi */}
          <div className="sticky bottom-0 z-20 shrink-0 border-t border-ink-200 bg-white px-4 pb-4 pt-3 lg:static">
            {cart.items.length > 0 && (
              <>
                <div className="mb-3 flex gap-2">
                  {has('pos.discount') && (
                    <Button
                      variant={totals.discountAmount > 0 ? 'primary' : 'outline'}
                      size="sm"
                      className="flex-1"
                      leftIcon={<Percent className="h-3.5 w-3.5" />}
                      onClick={() => setDiscountOpen(true)}
                    >
                      {totals.discountAmount > 0 ? `Diskon ${formatIDR(totals.discountAmount)}` : 'Diskon'}
                    </Button>
                  )}
                  <Button
                    variant={cart.note ? 'primary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    leftIcon={<NotebookPen className="h-3.5 w-3.5" />}
                    onClick={() => openNote('__order__', cart.note)}
                  >
                    Catatan
                  </Button>
                </div>

                <dl className="space-y-1 border-t border-dashed border-ink-200 pt-3">
                  <Line label={`Subtotal (${totals.itemCount} item)`} value={formatIDR(totals.subtotal)} />
                  {totals.discountAmount > 0 && (
                    <Line label="Diskon" value={`-${formatIDR(totals.discountAmount)}`} tone="danger" />
                  )}
                  {totals.serviceAmount > 0 && (
                    <Line label={`Service ${db.settings.service_percent}%`} value={formatIDR(totals.serviceAmount)} />
                  )}
                  {totals.taxAmount > 0 && (
                    <Line label={`PPN ${db.settings.tax_percent}%`} value={formatIDR(totals.taxAmount)} />
                  )}
                </dl>

                <div className="mt-3 flex items-end justify-between border-t border-ink-200 pt-3">
                  <span className="text-[13px] font-bold uppercase tracking-wide text-ink-500">Total</span>
                  <motion.span
                    key={totals.total}
                    initial={{ opacity: 0.4, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="figure text-[27px] leading-none text-ink-900"
                  >
                    {formatIDR(totals.total)}
                  </motion.span>
                </div>
              </>
            )}

            {cart.orderType === 'dine_in' && cart.items.length > 0 && !cart.tableId && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning-50 px-3 py-2.5 text-[12.5px] font-medium text-warning-700">
                <CircleAlert className="h-4 w-4 shrink-0" />
                Pilih meja terlebih dahulu untuk pesanan Dine In.
              </div>
            )}

            {/* Bill terbuka bisa disimpan dulu; pelanggan bayar saat mau pulang. */}
            {activeBill && (
              <Button
                size="lg"
                variant="outline"
                fullWidth
                className="mt-3"
                disabled={cart.items.length === 0}
                leftIcon={<Save className="h-4 w-4" />}
                onClick={() => {
                  saveBill({
                    billId: activeBill.id,
                    items: cart.items,
                    subtotal: totals.subtotal,
                    discountAmount: totals.discountAmount,
                    discountNote: cart.discountNote,
                    taxAmount: totals.taxAmount,
                    serviceAmount: totals.serviceAmount,
                    total: totals.total,
                    note: cart.note,
                    customerName: cart.customerName,
                    guestCount: cart.guestCount,
                    user,
                  })
                  toast.success('Bill tersimpan', `${cart.tableName ?? 'Meja'} · ${formatIDR(totals.total)}`)
                  cart.clear()
                }}
              >
                Simpan Bill
              </Button>
            )}

            <Button
              size="xl"
              fullWidth
              className="mt-3"
              disabled={!canProceed}
              onClick={() => setCheckoutOpen(true)}
              rightIcon={<ArrowRight className="h-[18px] w-[18px]" />}
            >
              {activeBill ? 'Bayar Bill Ini' : 'Lanjut ke Pembayaran'}
              {cart.items.length > 0 && <span className="ml-1 opacity-70">(F4)</span>}
            </Button>
          </div>
        </aside>
      </div>

      {/* ------------------------------- Dialog -------------------------------- */}

      <TablePickerModal open={tableOpen} onClose={() => setTableOpen(false)} />

      <DiscountModal open={discountOpen} onClose={() => setDiscountOpen(false)} subtotal={totals.subtotal} />

      <Modal
        open={!!noteItemId}
        onClose={() => setNoteItemId(null)}
        title={noteItemId === '__order__' ? 'Catatan Pesanan' : 'Catatan Item'}
        subtitle="Catatan akan tercetak pada struk pelanggan dan tiket dapur."
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setNoteItemId(null)}>
              Batal
            </Button>
            <Button
              fullWidth
              onClick={() => {
                if (noteItemId === '__order__') cart.setNote(noteDraft)
                else if (noteItemId) cart.setItemNote(noteItemId, noteDraft)
                setNoteItemId(null)
                toast.success('Catatan tersimpan')
              }}
            >
              Simpan Catatan
            </Button>
          </div>
        }
      >
        <Textarea
          rows={4}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="mis. tidak pedas, es sedikit, pisah saus..."
          autoFocus
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {['Tidak pedas', 'Level pedas 3', 'Es sedikit', 'Tanpa es', 'Less sugar', 'Pisah saus', 'Bungkus terpisah'].map((s) => (
            <button
              key={s}
              onClick={() => setNoteDraft((d) => (d ? `${d}, ${s}` : s))}
              className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              + {s}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => {
          setClearOpen(false)
          setClearReason('')
        }}
        onConfirm={() => {
          if (!clearReason.trim()) {
            toast.error('Alasan wajib diisi', 'Pembatalan pesanan harus disertai alasan untuk audit log.')
            return
          }
          useDataStore
            .getState()
            .log(user.id, user.name, 'transaction_cancelled', `Membatalkan draft pesanan: ${clearReason}`, null)
          cart.clear()
          setClearOpen(false)
          setClearReason('')
          toast.warning('Pesanan dibatalkan', 'Keranjang telah dikosongkan dan tercatat di audit log.')
        }}
        title="Kosongkan keranjang?"
        description="Seluruh item pada keranjang akan dihapus. Pesanan ini belum dibayar, namun tetap dicatat pada audit log."
        confirmLabel="Ya, batalkan"
        tone="danger"
      >
        <Input
          label="Alasan pembatalan"
          value={clearReason}
          onChange={(e) => setClearReason(e.target.value)}
          placeholder="mis. pelanggan berubah pikiran"
          autoFocus
        />
      </ConfirmDialog>

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onDone={() => {
          setCheckoutOpen(false)
          cart.clear()
        }}
        payload={checkoutPayload}
        settings={db.settings}
      />

      <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Pintasan Papan Ketik" size="sm">
        <ul className="space-y-2.5">
          {[
            ['F2', 'Fokus ke kolom pencarian menu'],
            ['F4', 'Lanjut ke pembayaran'],
            ['F8', 'Kosongkan keranjang / lepas bill'],
            ['Esc', 'Bersihkan pencarian / tutup dialog'],
            ['Shift + ?', 'Tampilkan daftar pintasan'],
          ].map(([key, desc]) => (
            <li key={key} className="flex items-center gap-3">
              <kbd className="min-w-[62px] rounded-lg border border-ink-300 bg-ink-50 px-2 py-1 text-center text-[12px] font-bold text-ink-700">
                {key}
              </kbd>
              <span className="text-[13px] text-ink-600">{desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl bg-info-50 p-3 text-[12.5px] leading-relaxed text-info-700">
          Barcode scanner mode keyboard juga didukung. Arahkan scanner ke halaman POS tanpa memfokuskan kolom input.
        </p>
      </Modal>
    </Page>
  )
}

/* ------------------------------- Sub-komponen ---------------------------- */

function CategoryChip({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  /** Ikon vektor untuk chip sistem, atau lambang kategori dari data. */
  icon: ReactNode
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-all active:scale-[.97]',
        active
          ? 'border-ink-900 bg-ink-900 text-ink-50 shadow-sm'
          : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:bg-brand-50/50',
      )}
    >
      <span className="grid h-4 w-4 place-items-center text-[15px] leading-none">{icon}</span>
      <span className="text-[13px] font-bold">{label}</span>
      <span
        className={cn(
          'rounded-md px-1.5 py-0.5 text-[10.5px] font-bold tnum',
          active ? 'bg-brand-500/25 text-brand-200' : 'bg-ink-100 text-ink-500',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function Line({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className={cn('text-[13px] font-semibold tnum', tone === 'danger' ? 'text-danger-600' : 'text-ink-800')}>
        {value}
      </dd>
    </div>
  )
}

/**
 * Pemilih meja di halaman kasir. Statusnya diturunkan dari bill terbuka yang
 * nyata, dan memilih meja langsung membuka atau melanjutkan bill-nya.
 */
function TablePickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDataStore((s) => s.db)
  const openBillAction = useDataStore((s) => s.openBill)
  const user = useAuthStore((s) => s.user)!
  const cart = useCartStore()

  const states = useMemo(() => allTableStates(db.tables, db.orders), [db.tables, db.orders])
  const areas = useMemo(() => Array.from(new Set(db.tables.map((t) => t.area))), [db.tables])

  const choose = (tableId: string) => {
    // Kasir kerap mengetik menu dulu baru memilih meja; isi keranjang harus ikut,
    // bukan tertimpa oleh isi bill meja tujuan.
    const carried = cart.items.reduce((a, i) => a + i.quantity, 0)
    const existing = billForTable(db.orders, tableId)
    if (existing) {
      cart.loadBill(existing, true)
      toast.info(
        'Bill dilanjutkan',
        carried > 0
          ? `${existing.table_name} · ${carried} porsi dari keranjang ikut ditambahkan`
          : `${existing.table_name} · ${existing.order_number}`,
      )
    } else {
      const bill = openBillAction(tableId, Math.max(1, cart.guestCount), cart.customerName, user)
      cart.loadBill(bill, true)
      toast.success('Bill dibuka', `${bill.table_name} · ${bill.order_number}`)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pilih Meja"
      subtitle="Memilih meja akan membuka bill baru, atau melanjutkan bill yang sudah berjalan."
      size="lg"
    >
      <div className="space-y-6">
        {areas.map((area) => (
          <section key={area}>
            <p className="section-title mb-3">{area}</p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {states
                .filter((st) => st.table.area === area)
                .map((st) => {
                  const selected = cart.tableId === st.table.id
                  const disabled = st.status === 'cleaning'
                  const tone = TABLE_TONE[st.status]
                  return (
                    <button
                      key={st.table.id}
                      disabled={disabled}
                      onClick={() => choose(st.table.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all active:scale-[.97]',
                        disabled ? 'cursor-not-allowed border-ink-200 bg-ink-50 opacity-55' : tone.card,
                        selected && 'ring-2 ring-brand-500 ring-offset-2',
                      )}
                    >
                      <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink-900">
                        {st.table.code}
                      </span>
                      <span className="text-[10.5px] text-ink-400">{st.table.capacity} kursi</span>
                      <span className={cn('mt-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]', tone.chip)}>
                        {TABLE_STATUS_LABEL[st.status]}
                      </span>
                      {st.bill && (
                        <span className="mt-1 text-[10.5px] font-bold tnum text-ink-700">{formatIDR(st.total)}</span>
                      )}
                    </button>
                  )
                })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}

function DiscountModal({ open, onClose, subtotal }: { open: boolean; onClose: () => void; subtotal: number }) {
  const cart = useCartStore()
  const [mode, setMode] = useState<DiscountMode>(cart.discountMode)
  const [value, setValue] = useState(cart.discountValue)
  const [note, setNote] = useState(cart.discountNote)

  useEffect(() => {
    if (open) {
      setMode(cart.discountMode)
      setValue(cart.discountValue)
      setNote(cart.discountNote)
    }
  }, [open])

  const preview =
    mode === 'percent' ? Math.round((subtotal * Math.min(value, 100)) / 100) : mode === 'amount' ? Math.min(value, subtotal) : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Diskon Transaksi"
      subtitle="Diskon dihitung dari subtotal sebelum pajak & service."
      size="md"
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              cart.setDiscount('none', 0, '')
              onClose()
              toast.info('Diskon dihapus')
            }}
          >
            Hapus Diskon
          </Button>
          <Button
            fullWidth
            onClick={() => {
              cart.setDiscount(mode, value, note)
              onClose()
              if (mode !== 'none') toast.success('Diskon diterapkan', formatIDR(preview))
            }}
          >
            Terapkan
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        {(['percent', 'amount'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setValue(0)
            }}
            className={cn(
              'rounded-xl border-2 p-3.5 text-center transition-all active:scale-[.98]',
              mode === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50',
            )}
          >
            <p className="text-[15px] font-bold">{m === 'percent' ? 'Persentase (%)' : 'Nominal (Rp)'}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-400">
              {m === 'percent' ? 'Potongan berdasarkan persen' : 'Potongan nilai tetap'}
            </p>
          </button>
        ))}
      </div>

      {mode !== 'none' && (
        <>
          <div className="mt-4">
            <Input
              label={mode === 'percent' ? 'Besar diskon (%)' : 'Nominal diskon'}
              inputMode="numeric"
              sizeVariant="lg"
              value={value ? (mode === 'percent' ? String(value) : formatNumber(value)) : ''}
              onChange={(e) => {
                const digits = Number(e.target.value.replace(/\D/g, '')) || 0
                setValue(mode === 'percent' ? Math.min(digits, 100) : digits)
              }}
              className="tnum text-[18px] font-extrabold"
              placeholder="0"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(mode === 'percent' ? [5, 10, 15, 20, 25, 50] : [5000, 10000, 20000, 25000, 50000]).map((v) => (
                <button
                  key={v}
                  onClick={() => setValue(v)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[12px] font-bold tnum transition-colors',
                    value === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50',
                  )}
                >
                  {mode === 'percent' ? `${v}%` : formatNumber(v)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Keterangan diskon"
            className="mt-4"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="mis. Promo member, voucher, diskon karyawan"
          />

          <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-100 px-4 py-3.5">
            <span className="text-[13px] font-semibold text-ink-600">Potongan yang diterapkan</span>
            <span className="text-[18px] figure text-danger-600">-{formatIDR(preview)}</span>
          </div>
        </>
      )}
    </Modal>
  )
}
