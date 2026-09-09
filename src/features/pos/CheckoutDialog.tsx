import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Delete,
  FileText,
  Landmark,
  Printer,
  QrCode,
  Receipt as ReceiptIcon,
  Sparkles,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/primitives'
import { StatRow } from '@/components/ui/StatCard'
import { cashSuggestions, cn, formatIDR, formatNumber } from '@/lib/utils'
import { ORDER_TYPE_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import { printer } from '@/hardware'
import { useDataStore, type CheckoutInput, type CheckoutResult } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { PaymentMethodCode, StoreSettings } from '@/types'
import { InvoiceA4, ThermalReceipt } from './Receipt'
import { Glyph } from '@/lib/glyphs'

const METHOD_ICONS: Record<PaymentMethodCode, typeof Banknote> = {
  cash: Banknote,
  qris: QrCode,
  transfer: Landmark,
  card: CreditCard,
}

export function CheckoutDialog({
  open,
  onClose,
  onDone,
  payload,
  settings,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  payload: Omit<CheckoutInput, 'method' | 'receivedAmount' | 'referenceNumber'> | null
  settings: StoreSettings
}) {
  const checkout = useDataStore((s) => s.checkout)
  const markPrinted = useDataStore((s) => s.markInvoicePrinted)
  const allMethods = useDataStore((s) => s.db.payment_methods)
  // Selector wajib mengembalikan referensi stabil; penyaringan dilakukan di sini.
  const methods = useMemo(() => allMethods.filter((m) => m.is_active), [allMethods])

  const [step, setStep] = useState<'payment' | 'success'>('payment')
  const [method, setMethod] = useState<PaymentMethodCode>('cash')
  const [received, setReceived] = useState(0)
  const [reference, setReference] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [receiptTab, setReceiptTab] = useState<'thermal' | 'a4'>('thermal')
  const cashRef = useRef<HTMLInputElement>(null)

  const total = payload?.total ?? 0

  useEffect(() => {
    if (!open) return
    setStep('payment')
    setMethod('cash')
    setReceived(0)
    setReference('')
    setResult(null)
    setReceiptTab('thermal')
    const t = setTimeout(() => cashRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [open])

  const suggestions = useMemo(() => cashSuggestions(total), [total])
  const change = Math.max(0, received - total)
  const shortfall = Math.max(0, total - received)

  const canConfirm =
    !!payload &&
    (method === 'cash' ? received >= total : true) &&
    (methods.find((m) => m.code === method)?.requires_reference ? reference.trim().length >= 4 : true)

  const confirm = () => {
    if (!payload || !canConfirm) return
    setProcessing(true)
    setTimeout(() => {
      const res = checkout({
        ...payload,
        method,
        receivedAmount: method === 'cash' ? received : total,
        referenceNumber: method === 'cash' ? null : reference.trim() || null,
      })
      setResult(res)
      setProcessing(false)
      setStep('success')
      toast.success('Pembayaran berhasil', `${res.order.order_number} · ${formatIDR(res.order.total)}`)
    }, 620)
  }

  const handlePrint = async (mode: 'thermal' | 'a4') => {
    if (!result) return
    const payloadForPrinter = {
      order: result.order,
      payment: result.payment,
      invoiceNumber: result.invoiceNumber,
      cashier: { id: result.order.cashier_id, name: result.order.cashier_name },
      settings,
    }
    if (mode === 'thermal') await printer().printReceipt(payloadForPrinter)
    else await printer().printInvoiceA4(payloadForPrinter)
    markPrinted(result.order.id)
    toast.info('Perintah cetak dikirim', 'Gunakan opsi "Simpan sebagai PDF" bila printer belum terpasang.')
  }

  const pressKey = (key: string) => {
    if (key === 'del') return setReceived((v) => Math.floor(v / 10))
    if (key === 'clear') return setReceived(0)
    if (key === '000') return setReceived((v) => (v > 99999999 ? v : v * 1000))
    setReceived((v) => {
      const next = v * 10 + Number(key)
      return next > 99999999 ? v : next
    })
  }

  if (!payload) return null

  /* ------------------------------ Sukses -------------------------------- */

  if (step === 'success' && result) {
    return (
      <Modal open={open} onClose={onDone} size="xl" hideClose closeOnBackdrop={false}>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-success-50">
                <Check className="h-7 w-7 text-success-600" strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-[22px] font-extrabold leading-tight text-ink-900">Transaksi Berhasil</h2>
                <p className="mt-1 text-[13.5px] text-ink-500">
                  {result.order.order_number} · {ORDER_TYPE_LABEL[result.order.type]}
                  {result.order.table_name ? ` · ${result.order.table_name}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-ink-900 p-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Total Dibayar</p>
                <p className="mt-1.5 text-[22px] figure leading-none">{formatIDR(result.order.total)}</p>
              </div>
              <div className="rounded-2xl bg-ink-100 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Metode</p>
                <p className="mt-1.5 text-[17px] font-bold leading-none text-ink-900">{PAYMENT_LABEL[result.payment.method]}</p>
              </div>
              <div
                className={cn(
                  'rounded-2xl p-4',
                  result.payment.change_amount > 0 ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-ink-100',
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kembalian</p>
                <p
                  className={cn(
                    'mt-1.5 text-[22px] figure leading-none',
                    result.payment.change_amount > 0 ? 'text-brand-700' : 'text-ink-900',
                  )}
                >
                  {formatIDR(result.payment.change_amount)}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-ink-200 p-4">
              <p className="section-title mb-3">Rincian Pesanan</p>
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {result.order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100"><Glyph name={item.emoji} className="h-4 w-4 text-ink-600" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{item.product_name}</p>
                      {item.note && <p className="truncate text-[11.5px] text-ink-400">{item.note}</p>}
                    </div>
                    <span className="text-[12.5px] tnum text-ink-500">{item.quantity}×</span>
                    <span className="w-24 text-right text-[13px] font-bold tnum text-ink-900">{formatIDR(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button size="lg" leftIcon={<Printer className="h-4 w-4" />} onClick={() => handlePrint('thermal')}>
                Cetak Struk
              </Button>
              <Button size="lg" variant="outline" leftIcon={<FileText className="h-4 w-4" />} onClick={() => handlePrint('a4')}>
                Cetak Faktur A4
              </Button>
              <Button size="lg" variant="dark" className="ml-auto" leftIcon={<Sparkles className="h-4 w-4" />} onClick={onDone}>
                Transaksi Baru
              </Button>
            </div>
          </div>

          {/* Pratinjau struk */}
          <div className="rounded-2xl bg-ink-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="section-title">Pratinjau</p>
              <div className="inline-flex rounded-lg bg-white p-0.5">
                {(['thermal', 'a4'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setReceiptTab(t)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors',
                      receiptTab === t ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800',
                    )}
                  >
                    {t === 'thermal' ? '80mm' : 'A4'}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[52vh] overflow-y-auto rounded-xl">
              {receiptTab === 'thermal' ? (
                <ThermalReceipt
                  order={result.order}
                  payment={result.payment}
                  invoiceNumber={result.invoiceNumber}
                  settings={settings}
                />
              ) : (
                // A4 (794px) diperkecil agar muat pada panel pratinjau.
                <div className="mx-auto h-[440px] w-[302px] overflow-hidden rounded-lg">
                  <div className="w-[794px] origin-top-left scale-[0.3803]">
                    <InvoiceA4
                      order={result.order}
                      payment={result.payment}
                      invoiceNumber={result.invoiceNumber}
                      settings={settings}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Area cetak tersembunyi (dipakai @media print) */}
        <div className="hidden">
          <ThermalReceipt
            order={result.order}
            payment={result.payment}
            invoiceNumber={result.invoiceNumber}
            settings={settings}
            screen={false}
          />
          <InvoiceA4
            order={result.order}
            payment={result.payment}
            invoiceNumber={result.invoiceNumber}
            settings={settings}
          />
        </div>
      </Modal>
    )
  }

  /* ----------------------------- Pembayaran ----------------------------- */

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Pembayaran"
      subtitle={`${payload.items.length} jenis item · ${payload.items.reduce((a, i) => a + i.quantity, 0)} porsi`}
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Ringkasan */}
        <div className="rounded-2xl border border-ink-200 bg-ink-50/70 p-5">
          <p className="section-title mb-3">Ringkasan Tagihan</p>
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {payload.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-600">
                  <b className="text-ink-800">{item.quantity}×</b> {item.product_name}
                </span>
                <span className="text-[12.5px] font-semibold tnum text-ink-800">{formatIDR(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-ink-200 pt-3">
            <StatRow label="Subtotal" value={formatIDR(payload.subtotal)} />
            {payload.discountAmount > 0 && (
              <StatRow label={`Diskon${payload.discountNote ? ` · ${payload.discountNote}` : ''}`} value={`-${formatIDR(payload.discountAmount)}`} tone="danger" />
            )}
            {payload.serviceAmount > 0 && (
              <StatRow label={`Service ${settings.service_percent}%`} value={formatIDR(payload.serviceAmount)} />
            )}
            {payload.taxAmount > 0 && <StatRow label={`PPN ${settings.tax_percent}%`} value={formatIDR(payload.taxAmount)} />}
          </div>

          <div className="mt-3 rounded-xl bg-ink-900 p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Total Tagihan</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none tnum">{formatIDR(total)}</p>
          </div>
        </div>

        {/* Metode & nominal */}
        <div>
          <p className="section-title mb-3">Metode Pembayaran</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {methods.map((m) => {
              const Icon = METHOD_ICONS[m.code]
              const active = method === m.code
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMethod(m.code)
                    setReference('')
                    if (m.code !== 'cash') setReceived(total)
                    else setReceived(0)
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 transition-all active:scale-[.98]',
                    active
                      ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-500/10'
                      : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50',
                  )}
                >
                  <Icon className={cn('h-6 w-6', active ? 'text-brand-600' : 'text-ink-400')} />
                  <span className={cn('text-[12.5px] font-bold', active ? 'text-brand-700' : 'text-ink-700')}>{m.name}</span>
                </button>
              )
            })}
          </div>

          {method === 'cash' ? (
            <div className="mt-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <Input
                    ref={cashRef}
                    label="Uang Diterima"
                    inputMode="numeric"
                    sizeVariant="lg"
                    value={received ? formatNumber(received) : ''}
                    onChange={(e) => setReceived(Number(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="0"
                    leftIcon={<span className="text-[13px] font-bold text-ink-500">Rp</span>}
                    className="tnum text-[19px] font-extrabold"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setReceived(s)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-[12.5px] font-bold tnum transition-all active:scale-95',
                          received === s
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50',
                        )}
                      >
                        {s === total ? 'Uang Pas' : formatNumber(s)}
                      </button>
                    ))}
                  </div>

                  <div
                    className={cn(
                      'mt-4 rounded-2xl p-4 transition-colors',
                      shortfall > 0 ? 'bg-danger-50 ring-1 ring-danger-100' : 'bg-brand-50 ring-1 ring-brand-200',
                    )}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {shortfall > 0 ? 'Kurang Bayar' : 'Kembalian'}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-[30px] font-extrabold leading-none tnum',
                        shortfall > 0 ? 'text-danger-600' : 'text-brand-700',
                      )}
                    >
                      {formatIDR(shortfall > 0 ? shortfall : change)}
                    </p>
                  </div>
                </div>

                {/* Keypad */}
                <div className="grid w-full grid-cols-3 gap-2 sm:w-[210px]">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map((k) => (
                    <button
                      key={k}
                      onClick={() => pressKey(k)}
                      className={cn(
                        'grid h-[52px] place-items-center rounded-xl border border-ink-200 bg-white text-[17px] font-bold text-ink-800',
                        'transition-colors hover:bg-ink-50 active:scale-95',
                        k === 'del' && 'text-ink-500',
                      )}
                    >
                      {k === 'del' ? <Delete className="h-5 w-5" /> : k}
                    </button>
                  ))}
                  <button
                    onClick={() => pressKey('clear')}
                    className="col-span-3 h-11 rounded-xl border border-ink-200 bg-white text-[12px] font-bold text-ink-500 transition-colors hover:bg-ink-50 active:scale-95"
                  >
                    BERSIHKAN
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5">
                <p className="text-[12.5px] text-ink-500">{methods.find((m) => m.code === method)?.description}</p>
                {method === 'qris' && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="grid h-24 w-24 place-items-center rounded-xl bg-white ring-1 ring-ink-200">
                      <QrCode className="h-12 w-12 text-ink-700" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-ink-800">Tunjukkan QR ke pelanggan</p>
                      <p className="mt-1 text-[12px] text-ink-500">
                        Setelah pembayaran berhasil, masukkan nomor referensi dari aplikasi merchant.
                      </p>
                    </div>
                  </div>
                )}
                <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-ink-200">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Jumlah yang harus dibayar</p>
                  <p className="mt-1 text-[26px] font-extrabold leading-none tnum text-ink-900">{formatIDR(total)}</p>
                </div>
              </div>

              <Input
                label="Nomor Referensi / Approval Code"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="mis. QRIS-482913"
                hint="Wajib diisi sebagai bukti rekonsiliasi dengan mutasi rekening."
                sizeVariant="lg"
                className="tnum font-semibold"
              />
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="outline" size="xl" onClick={onClose} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Kembali
            </Button>
            <Button
              size="xl"
              fullWidth
              onClick={confirm}
              disabled={!canConfirm}
              loading={processing}
              leftIcon={!processing ? <ReceiptIcon className="h-[18px] w-[18px]" /> : undefined}
            >
              {processing ? 'Memproses…' : `Konfirmasi Pembayaran · ${formatIDR(total)}`}
            </Button>
          </div>
          {!canConfirm && method === 'cash' && received > 0 && (
            <p className="mt-2.5 text-center text-[12.5px] font-medium text-danger-600">
              Uang yang diterima belum mencukupi total tagihan.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
