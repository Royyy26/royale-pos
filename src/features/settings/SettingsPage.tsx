import { useState } from 'react'
import {
  Building2,
  CreditCard,
  Database,
  Percent,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Usb,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Input, SegmentedControl, Select, Switch, Table, Td, Textarea, Th } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Modal'
import { cn, formatIDR } from '@/lib/utils'
import { hardwareStatus, printer } from '@/hardware'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { StoreSettings } from '@/types'
import { ThermalReceipt } from '../pos/Receipt'
import { BRAND_GLYPHS } from '@/lib/glyphs'

type Tab = 'business' | 'tax' | 'receipt' | 'payment' | 'hardware' | 'data'

const TABS: { value: Tab; label: string }[] = [
  { value: 'business', label: 'Profil Bisnis' },
  { value: 'tax', label: 'Pajak & Service' },
  { value: 'receipt', label: 'Struk' },
  { value: 'payment', label: 'Pembayaran' },
  { value: 'hardware', label: 'Perangkat' },
  { value: 'data', label: 'Data' },
]

export function SettingsPage() {
  const db = useDataStore((s) => s.db)
  const updateSettings = useDataStore((s) => s.updateSettings)
  const reset = useDataStore((s) => s.reset)
  const actor = useAuthStore((s) => s.user)!

  const [tab, setTab] = useState<Tab>('business')
  const [form, setForm] = useState<StoreSettings>(db.settings)
  const [resetOpen, setResetOpen] = useState(false)

  const set = <K extends keyof StoreSettings,>(key: K, value: StoreSettings[K]) => setForm((f) => ({ ...f, [key]: value }))

  const dirty = JSON.stringify(form) !== JSON.stringify(db.settings)

  const save = () => {
    updateSettings(form, actor)
    toast.success('Pengaturan tersimpan', 'Perubahan langsung berlaku pada seluruh halaman.')
  }

  /* Contoh order untuk pratinjau struk */
  const sampleOrder = db.orders.find((o) => o.status === 'completed') ?? db.orders[0]
  const samplePayment = sampleOrder ? db.payments.find((p) => p.order_id === sampleOrder.id) ?? null : null

  const devices = hardwareStatus()

  return (
    <Page
      title="Pengaturan Sistem"
      subtitle="Konfigurasi bisnis, pajak, struk, dan perangkat"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setForm(db.settings)} disabled={!dirty}>
            Kembalikan
          </Button>
          <Button leftIcon={<Save className="h-4 w-4" />} onClick={save} disabled={!dirty}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="mb-5 overflow-x-auto">
        <SegmentedControl value={tab} onChange={setTab} options={TABS} />
      </div>

      {dirty && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-warning-500" />
          <p className="text-[13px] font-semibold text-warning-800">Terdapat perubahan yang belum disimpan.</p>
        </div>
      )}

      {tab === 'business' && (
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Profil Bisnis</h2>
              <p className="text-[13px] text-ink-500">Informasi ini tampil pada struk, faktur, dan halaman login.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nama bisnis" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} />
            <Input label="Tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
            <Input label="Nomor telepon" value={form.phone} onChange={(e) => set('phone', e.target.value)} inputClassName="tnum" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="NPWP" value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} inputClassName="tnum" />
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-700">Lambang merek</p>
              <div className="flex flex-wrap gap-2">
                {BRAND_GLYPHS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set('logo_emoji', key)}
                    title={label}
                    aria-label={label}
                    aria-pressed={form.logo_emoji === key}
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-xl border-2 transition-all active:scale-95',
                      form.logo_emoji === key
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-700',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Textarea label="Alamat lengkap" className="mt-4" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Card>
      )}

      {tab === 'tax' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Percent className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Pajak & Service Charge</h2>
                <p className="text-[13px] text-ink-500">Berlaku otomatis pada seluruh transaksi baru.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-ink-200 p-4">
                <Switch checked={form.tax_enabled} onChange={(v) => set('tax_enabled', v)} label="Aktifkan PPN" description="Pajak dihitung dari subtotal setelah diskon dan service charge." />
                <Input
                  label="Persentase PPN (%)"
                  className="mt-4"
                  inputMode="numeric"
                  value={String(form.tax_percent)}
                  onChange={(e) => set('tax_percent', Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0))}
                  disabled={!form.tax_enabled}
                />
              </div>

              <div className="rounded-2xl border border-ink-200 p-4">
                <Switch
                  checked={form.service_enabled}
                  onChange={(v) => set('service_enabled', v)}
                  label="Aktifkan Service Charge"
                  description="Hanya diterapkan pada pesanan Dine In."
                />
                <Input
                  label="Persentase service charge (%)"
                  className="mt-4"
                  inputMode="numeric"
                  value={String(form.service_percent)}
                  onChange={(e) => set('service_percent', Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0))}
                  disabled={!form.service_enabled}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Simulasi Perhitungan</h2>
            <p className="mt-1 text-[13px] text-ink-500">Contoh transaksi Dine In dengan subtotal Rp 100.000.</p>
            <div className="mt-5 space-y-2.5">
              {(() => {
                const subtotal = 100000
                const service = form.service_enabled ? Math.round((subtotal * form.service_percent) / 100) : 0
                const tax = form.tax_enabled ? Math.round(((subtotal + service) * form.tax_percent) / 100) : 0
                const rows = [
                  { label: 'Subtotal', value: subtotal },
                  { label: `Service charge ${form.service_percent}%`, value: service },
                  { label: `PPN ${form.tax_percent}%`, value: tax },
                ]
                return (
                  <>
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between rounded-xl bg-ink-100 px-4 py-3">
                        <span className="text-[13px] font-medium text-ink-600">{r.label}</span>
                        <span className="text-[14px] font-bold tnum text-ink-900">{formatIDR(r.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-xl bg-ink-900 px-4 py-4 text-white">
                      <span className="text-[13px] font-semibold text-white/70">Total dibayar pelanggan</span>
                      <span className="text-[20px] figure">{formatIDR(subtotal + service + tax)}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </Card>
        </div>
      )}

      {tab === 'receipt' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-info-50 text-info-600">
                <Receipt className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Pengaturan Struk</h2>
                <p className="text-[13px] text-ink-500">Tampilan struk pelanggan dan faktur A4.</p>
              </div>
            </div>

            <Select
              label="Lebar kertas struk"
              value={form.receipt_width}
              onChange={(e) => set('receipt_width', e.target.value as StoreSettings['receipt_width'])}
              options={[
                { value: '80mm', label: '80mm (standar thermal printer)' },
                { value: '58mm', label: '58mm (printer mini / mobile)' },
              ]}
              hint="Pengaturan ini menjadi acuan saat driver thermal printer dipasang."
            />

            <Textarea
              label="Teks penutup struk"
              className="mt-4"
              rows={3}
              value={form.receipt_footer}
              onChange={(e) => set('receipt_footer', e.target.value)}
              hint="Gunakan baris baru untuk memisahkan kalimat."
            />

            <div className="mt-5 rounded-2xl bg-info-50 p-4">
              <p className="text-[13px] font-bold text-info-800">Cetak saat ini</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-info-700">
                Sistem menggunakan dialog cetak browser sehingga struk dapat dicetak ke printer apa pun atau disimpan
                sebagai PDF. Lapisan abstraksi printer sudah disiapkan agar driver thermal ESC/POS dapat dipasang tanpa
                mengubah halaman kasir.
              </p>
            </div>
          </Card>

          {sampleOrder && (
            <Card className="p-5">
              <p className="section-title mb-3">Pratinjau Struk</p>
              <div className="max-h-[560px] overflow-y-auto rounded-xl bg-ink-100 p-4">
                <ThermalReceipt
                  order={sampleOrder}
                  payment={samplePayment}
                  invoiceNumber={sampleOrder.order_number.replace('ORD', 'INV')}
                  settings={form}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'payment' && (
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Metode Pembayaran</h2>
              <p className="text-[13px] text-ink-500">Kanal pembayaran yang tersedia pada halaman checkout.</p>
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Metode</Th>
                <Th>Keterangan</Th>
                <Th align="center">Butuh Referensi</Th>
                <Th align="right">Biaya Admin</Th>
                <Th align="center">Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.payment_methods.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-ink-50/60">
                  <Td className="font-bold text-ink-900">{m.name}</Td>
                  <Td className="text-[12.5px] text-ink-600">{m.description}</Td>
                  <Td align="center">
                    <Badge tone={m.requires_reference ? 'info' : 'neutral'}>{m.requires_reference ? 'Ya' : 'Tidak'}</Badge>
                  </Td>
                  <Td align="right" className="tnum text-ink-700">{m.admin_fee_percent}%</Td>
                  <Td align="center">
                    <Badge tone={m.is_active ? 'success' : 'neutral'} dot>
                      {m.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>

          <p className="mt-4 rounded-xl bg-ink-100 p-4 text-[12.5px] leading-relaxed text-ink-600">
            Struktur data metode pembayaran sudah mendukung penambahan kanal baru (mis. e-wallet langsung, voucher,
            atau kartu member) tanpa mengubah alur checkout.
          </p>
        </Card>
      )}

      {tab === 'hardware' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-ink-600">
                <Usb className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Status Perangkat</h2>
                <p className="text-[13px] text-ink-500">Lapisan abstraksi hardware POS.</p>
              </div>
            </div>

            <div className="space-y-3">
              {devices.map((d) => (
                <div key={d.group} className={cn('rounded-2xl border p-4', d.connected ? 'border-success-200 bg-success-50/40' : 'border-ink-200')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-ink-900">{d.group}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-500">{d.name}</p>
                    </div>
                    <Badge tone={d.connected ? 'success' : 'neutral'} dot>
                      {d.connected ? 'Terhubung' : 'Belum terpasang'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12px] text-ink-500">{d.message}</p>
                </div>
              ))}
            </div>

            <Button
              className="mt-5"
              variant="outline"
              fullWidth
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={async () => {
                await printer().connect()
                toast.success('Printer siap', printer().status().message)
              }}
            >
              Uji Koneksi Printer
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Rencana Integrasi Perangkat</h2>
            <p className="mt-1 text-[13px] text-ink-500">
              Antarmuka driver telah didefinisikan pada <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[11.5px]">src/hardware</code>.
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { title: 'Thermal / Receipt Printer', desc: 'Implementasikan PrinterDriver dengan perintah ESC/POS melalui WebUSB atau print server lokal.' },
                { title: 'Cash Drawer', desc: 'Gunakan drawer kick 0x1B 0x70 melalui port printer setelah pembayaran tunai berhasil.' },
                { title: 'Barcode Scanner', desc: 'Sudah didukung dalam mode keyboard-wedge; driver khusus dapat menggantikan ScannerDriver.' },
                { title: 'Customer Display', desc: 'Implementasikan CustomerDisplayDriver untuk menampilkan total dan kembalian ke pelanggan.' },
              ].map((item) => (
                <li key={item.title} className="rounded-xl border border-ink-200 p-4">
                  <p className="text-[13.5px] font-bold text-ink-900">{item.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{item.desc}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'data' && (
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-ink-600">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink-900">Data Sistem</h2>
              <p className="text-[13px] text-ink-500">Ringkasan isi basis data lokal (mode prototipe).</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Pesanan', value: db.orders.length },
              { label: 'Pembayaran', value: db.payments.length },
              { label: 'Produk', value: db.products.length },
              { label: 'Item Inventori', value: db.inventory.length },
              { label: 'Pergerakan Stok', value: db.stock_movements.length },
              { label: 'Target Penjualan', value: db.targets.length },
              { label: 'Audit Log', value: db.audit_logs.length },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-ink-200 p-4">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">{s.label}</p>
                <p className="mt-1 text-[22px] figure text-ink-900">{s.value.toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-danger-200 bg-danger-50 p-5">
            <p className="text-[14px] font-bold text-danger-800">Reset Data Demo</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-danger-700">
              Seluruh transaksi, shift, rekonsiliasi, dan perubahan master data akan dikembalikan ke kondisi awal
              beserta data dummy 75 hari terakhir dan target bulanan. Tindakan ini tidak dapat dibatalkan.
            </p>
            <Button variant="danger" className="mt-4" onClick={() => setResetOpen(true)}>
              Reset ke Data Awal
            </Button>
          </div>

          <p className="mt-5 rounded-xl bg-ink-100 p-4 text-[12.5px] leading-relaxed text-ink-600">
            Pada versi prototipe ini data tersimpan di <b>localStorage</b> peramban. Seluruh akses data melewati
            modul <code className="rounded bg-white px-1 py-0.5 font-mono text-[11.5px]">src/db/database.ts</code>, sehingga
            migrasi ke REST API atau basis data relasional cukup mengganti implementasi modul tersebut. Skema tabel
            lengkap tersedia pada <code className="rounded bg-white px-1 py-0.5 font-mono text-[11.5px]">docs/schema.sql</code>.
          </p>
        </Card>
      )}

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          reset()
          setResetOpen(false)
          setForm(useDataStore.getState().db.settings)
          toast.warning('Data direset', 'Sistem dikembalikan ke data demo awal.')
        }}
        title="Reset seluruh data?"
        description="Semua transaksi dan perubahan yang Anda buat akan hilang dan digantikan data demo awal."
        confirmLabel="Ya, reset data"
      />
    </Page>
  )
}
