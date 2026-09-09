import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Armchair,
  CalendarClock,
  Clock,
  CreditCard,
  Plus,
  Receipt,
  SprayCan,
  Users,
  Utensils,
  XCircle,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, Input } from '@/components/ui/primitives'
import { ConfirmDialog, Drawer } from '@/components/ui/Modal'
import { StatCard, StatRow } from '@/components/ui/StatCard'
import { Stagger } from '@/components/ui/motion'
import { cn, formatIDR, formatTime } from '@/lib/utils'
import { TABLE_STATUS_LABEL } from '@/lib/labels'
import { TABLE_TONE, allTableStates, summarizeTables, type TableState } from '@/lib/tables'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore } from '@/store/useCartStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

/**
 * Denah meja. Status di sini selalu diturunkan dari bill terbuka, sehingga
 * papan ini tidak bisa berbeda dengan kenyataan di halaman kasir.
 */
export function TablesPage() {
  const db = useDataStore((s) => s.db)
  const openBill = useDataStore((s) => s.openBill)
  const cancelBill = useDataStore((s) => s.cancelBill)
  const setTableStatus = useDataStore((s) => s.setTableStatus)
  const loadBill = useCartStore((s) => s.loadBill)
  const user = useAuthStore((s) => s.user)!
  const navigate = useNavigate()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [guests, setGuests] = useState(2)
  const [customer, setCustomer] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const states = useMemo(() => allTableStates(db.tables, db.orders), [db.tables, db.orders])
  const summary = useMemo(() => summarizeTables(states), [states])
  const areas = useMemo(() => Array.from(new Set(db.tables.map((t) => t.area))), [db.tables])

  const selected = states.find((s) => s.table.id === selectedId) ?? null

  const closeDrawer = () => {
    setSelectedId(null)
    setGuests(2)
    setCustomer('')
  }

  const handleOpenBill = (state: TableState) => {
    const bill = openBill(state.table.id, guests, customer.trim(), user)
    loadBill(bill)
    toast.success('Bill dibuka', `${state.table.name} · ${bill.order_number}`)
    closeDrawer()
    navigate('/pos')
  }

  const handleContinue = (state: TableState) => {
    if (!state.bill) return
    loadBill(state.bill)
    closeDrawer()
    navigate('/pos')
  }

  return (
    <Page title="Denah Meja" subtitle={`${summary.occupied} dari ${summary.total} meja terisi`}>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Meja Kosong" value={summary.available} tone="neutral" compact icon={<Armchair className="h-5 w-5" />} />
        <StatCard label="Sedang Terisi" value={summary.occupied} tone="brand" compact icon={<Utensils className="h-5 w-5" />} sublabel={`${summary.guests} tamu`} />
        <StatCard label="Dipesan" value={summary.reserved} tone="info" compact icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Nilai Bill Terbuka" value={formatIDR(summary.openBillValue)} tone="success" compact icon={<Receipt className="h-5 w-5" />} />
      </div>

      {/* Keterangan warna */}
      <Card className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
        <span className="section-title">Keterangan</span>
        {(['available', 'occupied', 'reserved', 'cleaning'] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-2 text-[12.5px] text-ink-600">
            <span className={cn('h-2.5 w-2.5 rounded-full', TABLE_TONE[status].dot)} />
            {TABLE_STATUS_LABEL[status]}
          </span>
        ))}
      </Card>

      {areas.map((area) => {
        const inArea = states.filter((s) => s.table.area === area)
        return (
          <section key={area} className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">{area}</h2>
              <span className="h-px flex-1 bg-ink-200" />
              <span className="text-[12px] text-ink-500">
                {inArea.filter((s) => s.status === 'occupied').length}/{inArea.length} terisi
              </span>
            </div>

            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" gap={0.03}>
              {inArea.map((state) => {
                const tone = TABLE_TONE[state.status]
                return (
                  <button
                    key={state.table.id}
                    onClick={() => setSelectedId(state.table.id)}
                    className={cn(
                      'group flex flex-col rounded-2xl border-2 p-4 text-left transition-all active:scale-[.98]',
                      tone.card,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display text-[20px] font-bold tracking-[-0.03em] text-ink-900">
                        {state.table.code}
                      </span>
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em]', tone.chip)}>
                        {TABLE_STATUS_LABEL[state.status]}
                      </span>
                    </div>

                    <span className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-500">
                      <Users className="h-3 w-3" />
                      {state.table.capacity} kursi
                    </span>

                    {state.bill ? (
                      <div className="mt-3 border-t border-ink-900/10 pt-2.5">
                        <p className="figure text-[15px] text-ink-900">{formatIDR(state.total)}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-600">
                          <Clock className="h-3 w-3" />
                          {state.duration} · {state.itemCount} porsi
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 border-t border-ink-200 pt-2.5 text-[11.5px] text-ink-400">Belum ada bill</p>
                    )}
                  </button>
                )
              })}
            </Stagger>
          </section>
        )
      })}

      {/* Panel detail meja */}
      <Drawer
        open={!!selected}
        onClose={closeDrawer}
        title={selected?.table.name}
        subtitle={selected ? `${selected.table.area} · ${selected.table.capacity} kursi` : undefined}
        width="max-w-md"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', TABLE_TONE[selected.status].dot)} />
              <Badge tone={selected.status === 'occupied' ? 'brand' : selected.status === 'reserved' ? 'info' : selected.status === 'cleaning' ? 'warning' : 'neutral'}>
                {TABLE_STATUS_LABEL[selected.status]}
              </Badge>
            </div>

            {selected.bill ? (
              <>
                <div className="rounded-2xl bg-ink-900 p-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Bill Berjalan</p>
                  <p className="mt-1 figure text-[26px] leading-none">{formatIDR(selected.total)}</p>
                  <p className="mt-2 text-[12.5px] text-white/55">
                    {selected.bill.order_number} · dibuka {formatTime(selected.bill.created_at)} ({selected.duration})
                  </p>
                </div>

                <div>
                  <p className="section-title mb-2">Item ({selected.itemCount} porsi)</p>
                  {selected.bill.items.length === 0 ? (
                    <p className="rounded-xl bg-ink-100 p-4 text-[12.5px] text-ink-500">
                      Bill masih kosong. Lanjutkan di halaman kasir untuk menambahkan pesanan.
                    </p>
                  ) : (
                    <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
                      {selected.bill.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 px-3.5 py-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100"><Glyph name={item.emoji} className="h-4 w-4 text-ink-600" /></span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink-800">
                            {item.product_name}
                          </span>
                          <span className="text-[12px] tnum text-ink-500">{item.quantity}×</span>
                          <span className="w-24 text-right text-[12.5px] font-bold tnum text-ink-900">
                            {formatIDR(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="divide-y divide-ink-100 rounded-xl border border-ink-200 px-4">
                  <StatRow label="Tamu" value={`${selected.bill.guest_count} orang`} />
                  <StatRow label="Pelanggan" value={selected.bill.customer_name || 'Umum'} />
                  <StatRow label="Kasir" value={selected.bill.cashier_name} />
                  <StatRow label="Total" value={formatIDR(selected.total)} bold />
                </div>

                <div className="space-y-2">
                  <Button fullWidth size="lg" leftIcon={<Plus className="h-4 w-4" />} onClick={() => handleContinue(selected)}>
                    Lanjutkan Pesanan
                  </Button>
                  <Button
                    fullWidth
                    size="lg"
                    variant="accent"
                    leftIcon={<CreditCard className="h-4 w-4" />}
                    onClick={() => handleContinue(selected)}
                    disabled={selected.bill.items.length === 0}
                  >
                    Bayar Bill Ini
                  </Button>
                  <Button
                    fullWidth
                    variant="danger-soft"
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => setCancelOpen(true)}
                  >
                    Batalkan Bill
                  </Button>
                </div>
              </>
            ) : (
              <>
                <EmptyState
                  icon={<Armchair className="h-7 w-7" />}
                  title="Meja belum terpakai"
                  description="Buka bill untuk mulai mencatat pesanan pelanggan di meja ini."
                  className="py-6"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Jumlah tamu"
                    inputMode="numeric"
                    value={String(guests)}
                    onChange={(e) => setGuests(Number(e.target.value.replace(/\D/g, '')) || 1)}
                    inputClassName="tnum"
                  />
                  <Input
                    label="Nama pelanggan"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="opsional"
                  />
                </div>

                <Button fullWidth size="lg" leftIcon={<Receipt className="h-4 w-4" />} onClick={() => handleOpenBill(selected)}>
                  Buka Bill
                </Button>

                <div>
                  <p className="section-title mb-2">Tandai Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { status: 'available' as const, label: 'Kosong', icon: Armchair },
                      { status: 'reserved' as const, label: 'Dipesan', icon: CalendarClock },
                      { status: 'cleaning' as const, label: 'Bersihkan', icon: SprayCan },
                    ]).map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.status}
                          onClick={() => {
                            setTableStatus(selected.table.id, opt.status)
                            toast.info(`${selected.table.name} ditandai ${TABLE_STATUS_LABEL[opt.status]}`)
                          }}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all active:scale-[.97]',
                            selected.status === opt.status
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-ink-200 text-ink-500 hover:bg-ink-50',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[11.5px] font-bold">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false)
          setCancelReason('')
        }}
        onConfirm={() => {
          if (!selected?.bill) return
          if (cancelReason.trim().length < 4) {
            toast.error('Alasan wajib diisi', 'Minimal 4 karakter untuk keperluan audit.')
            return
          }
          cancelBill(selected.bill.id, cancelReason.trim(), user)
          toast.warning('Bill dibatalkan', `${selected.table.name} kembali kosong, stok dikembalikan.`)
          setCancelOpen(false)
          setCancelReason('')
          closeDrawer()
        }}
        title="Batalkan bill meja ini?"
        description="Seluruh item pada bill akan dibatalkan, stoknya dikembalikan, dan meja menjadi kosong."
        confirmLabel="Ya, batalkan bill"
      >
        <Input
          label="Alasan pembatalan"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="mis. pelanggan batal memesan"
          autoFocus
        />
      </ConfirmDialog>
    </Page>
  )
}
