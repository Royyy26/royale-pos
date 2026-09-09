import QRCode from 'react-qr-code'
import { formatDate, formatIDR, formatTime } from '@/lib/utils'
import { ORDER_TYPE_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import type { Order, Payment, StoreSettings } from '@/types'
import { Glyph } from '@/lib/glyphs'

/**
 * Struk 80mm — tampilan layar dibuat menyerupai kertas thermal.
 * Elemen ini juga menjadi target cetak (#receipt-print-area).
 */
export function ThermalReceipt({
  order,
  payment,
  invoiceNumber,
  settings,
  idAttr = 'receipt-print-area',
  screen = true,
}: {
  order: Order
  payment: Payment | null
  invoiceNumber: string
  settings: StoreSettings
  idAttr?: string
  screen?: boolean
}) {
  const Divider = () => <div className="receipt-divider my-2" />

  return (
    <div
      id={idAttr}
      className={
        screen
          ? 'receipt-paper mx-auto bg-white px-4 py-5 shadow-card ring-1 ring-ink-200'
          : 'receipt-paper bg-white px-3 py-4'
      }
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center"><Glyph name={settings.logo_emoji} className="h-6 w-6" /></div>
        <p className="mt-1.5 text-[13px] font-bold uppercase tracking-wide">{settings.business_name}</p>
        <p className="text-[10px] leading-snug">{settings.address}</p>
        <p className="text-[10px]">Telp {settings.phone}</p>
        <p className="text-[10px]">NPWP {settings.tax_id}</p>
      </div>

      <Divider />

      {/* Info transaksi */}
      <div className="space-y-0.5 text-[10.5px]">
        <Row label="No. Faktur" value={invoiceNumber} />
        <Row label="No. Pesanan" value={order.order_number} />
        <Row label="Tanggal" value={formatDate(order.created_at)} />
        <Row label="Waktu" value={formatTime(order.created_at)} />
        <Row label="Kasir" value={order.cashier_name} />
        <Row label="Tipe" value={ORDER_TYPE_LABEL[order.type]} />
        {order.table_name && <Row label="Meja" value={order.table_name} />}
        {order.customer_name && <Row label="Pelanggan" value={order.customer_name} />}
      </div>

      <Divider />

      {/* Item */}
      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id}>
            <p className="text-[11px] font-bold uppercase leading-tight">{item.product_name}</p>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10.5px]">
                {item.quantity} × {formatIDR(item.price).replace('Rp', 'Rp')}
              </span>
              <span className="text-[11px] font-bold tabular-nums">{formatIDR(item.subtotal)}</span>
            </div>
            {item.note && <p className="pl-2 text-[9.5px] italic text-neutral-600">* {item.note}</p>}
          </div>
        ))}
      </div>

      <Divider />

      {/* Ringkasan */}
      <div className="space-y-0.5 text-[10.5px]">
        <Row label={`Subtotal (${order.items.reduce((a, i) => a + i.quantity, 0)} item)`} value={formatIDR(order.subtotal)} mono />
        {order.discount_amount > 0 && (
          <Row label={`Diskon${order.discount_note ? ` · ${order.discount_note}` : ''}`} value={`-${formatIDR(order.discount_amount)}`} mono />
        )}
        {order.service_amount > 0 && (
          <Row label={`Service ${settings.service_percent}%`} value={formatIDR(order.service_amount)} mono />
        )}
        {order.tax_amount > 0 && <Row label={`PPN ${settings.tax_percent}%`} value={formatIDR(order.tax_amount)} mono />}
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase">Total</span>
        <span className="text-[15px] font-extrabold tabular-nums">{formatIDR(order.total)}</span>
      </div>

      <Divider />

      {/* Pembayaran */}
      {payment && (
        <div className="space-y-0.5 text-[10.5px]">
          <Row label="Metode" value={PAYMENT_LABEL[payment.method]} />
          {payment.method === 'cash' ? (
            <>
              <Row label="Tunai" value={formatIDR(payment.received_amount)} mono />
              <Row label="Kembalian" value={formatIDR(payment.change_amount)} mono />
            </>
          ) : (
            <>
              <Row label="Dibayar" value={formatIDR(payment.amount)} mono />
              {payment.reference_number && <Row label="Ref" value={payment.reference_number} />}
            </>
          )}
        </div>
      )}

      {order.note && (
        <>
          <Divider />
          <p className="text-[10px] italic">Catatan: {order.note}</p>
        </>
      )}

      <Divider />

      {/* QR + footer */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <div className="bg-white p-1.5">
          <QRCode
            value={`${invoiceNumber}|${order.order_number}|${order.total}|${order.created_at}`}
            size={78}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
        <p className="text-[9px] tracking-wide">Pindai untuk verifikasi faktur</p>
      </div>

      <div className="mt-3 whitespace-pre-line text-center text-[10px] leading-relaxed">
        {settings.receipt_footer}
      </div>

      <p className="mt-2 text-center text-[8.5px] text-neutral-500">
        Dicetak {formatDate(new Date())} {formatTime(new Date())} · Royale POS
      </p>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <span className={`text-right ${mono ? 'font-bold tabular-nums' : 'font-semibold'}`}>{value}</span>
    </div>
  )
}

/* ========================================================================== */
/*  FAKTUR A4                                                                 */
/* ========================================================================== */

export function InvoiceA4({
  order,
  payment,
  invoiceNumber,
  settings,
  idAttr = 'invoice-print-area',
}: {
  order: Order
  payment: Payment | null
  invoiceNumber: string
  settings: StoreSettings
  idAttr?: string
}) {
  return (
    <div id={idAttr} className="mx-auto w-full max-w-[794px] bg-white p-10 text-ink-900 shadow-card ring-1 ring-ink-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-8 border-b-2 border-ink-900 pb-6">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Glyph name={settings.logo_emoji} className="h-7 w-7" /></div>
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight">{settings.business_name}</h1>
            <p className="text-[12px] text-ink-500">{settings.tagline}</p>
            <p className="mt-2 max-w-[280px] text-[11.5px] leading-relaxed text-ink-600">{settings.address}</p>
            <p className="text-[11.5px] text-ink-600">
              {settings.phone} · {settings.email}
            </p>
            <p className="text-[11.5px] text-ink-600">NPWP {settings.tax_id}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[26px] font-extrabold uppercase tracking-tight text-ink-900">Faktur</p>
          <p className="mt-1 text-[13px] font-bold tnum text-brand-600">{invoiceNumber}</p>
          <div className="mt-4 inline-block bg-white p-2 ring-1 ring-ink-200">
            <QRCode
              value={`${invoiceNumber}|${order.order_number}|${order.total}`}
              size={72}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0F172A"
            />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-6 grid grid-cols-4 gap-6">
        {[
          { label: 'Tanggal', value: formatDate(order.created_at) },
          { label: 'Waktu', value: formatTime(order.created_at) },
          { label: 'Kasir', value: order.cashier_name },
          { label: 'Tipe Pesanan', value: ORDER_TYPE_LABEL[order.type] },
          { label: 'No. Pesanan', value: order.order_number },
          { label: 'Meja', value: order.table_name ?? '—' },
          { label: 'Pelanggan', value: order.customer_name || 'Umum' },
          { label: 'Jumlah Tamu', value: String(order.guest_count) },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{m.label}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink-800">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabel item */}
      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-y border-ink-200 bg-ink-50">
            <th className="w-10 px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-500">No</th>
            <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-500">Deskripsi</th>
            <th className="w-20 px-3 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wider text-ink-500">Qty</th>
            <th className="w-32 px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-wider text-ink-500">Harga</th>
            <th className="w-32 px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-wider text-ink-500">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={item.id} className="border-b border-ink-100">
              <td className="px-3 py-3 text-[12px] tnum text-ink-500">{i + 1}</td>
              <td className="px-3 py-3">
                <p className="text-[13px] font-semibold text-ink-900">{item.product_name}</p>
                {item.note && <p className="mt-0.5 text-[11px] italic text-ink-500">{item.note}</p>}
              </td>
              <td className="px-3 py-3 text-center text-[13px] tnum font-semibold text-ink-700">{item.quantity}</td>
              <td className="px-3 py-3 text-right text-[13px] tnum text-ink-700">{formatIDR(item.price)}</td>
              <td className="px-3 py-3 text-right text-[13px] tnum font-bold text-ink-900">{formatIDR(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Ringkasan */}
      <div className="mt-6 flex justify-end">
        <div className="w-[320px] space-y-1.5">
          <SummaryLine label="Subtotal" value={formatIDR(order.subtotal)} />
          {order.discount_amount > 0 && (
            <SummaryLine label={`Diskon${order.discount_note ? ` (${order.discount_note})` : ''}`} value={`-${formatIDR(order.discount_amount)}`} negative />
          )}
          {order.service_amount > 0 && (
            <SummaryLine label={`Service Charge ${settings.service_percent}%`} value={formatIDR(order.service_amount)} />
          )}
          {order.tax_amount > 0 && <SummaryLine label={`PPN ${settings.tax_percent}%`} value={formatIDR(order.tax_amount)} />}
          <div className="mt-2 flex items-center justify-between border-t-2 border-ink-900 pt-3">
            <span className="text-[14px] font-extrabold uppercase">Total</span>
            <span className="text-[20px] font-extrabold tnum">{formatIDR(order.total)}</span>
          </div>
          {payment && (
            <div className="mt-4 space-y-1.5 rounded-xl bg-ink-50 p-4">
              <SummaryLine label="Metode Pembayaran" value={PAYMENT_LABEL[payment.method]} />
              {payment.method === 'cash' ? (
                <>
                  <SummaryLine label="Uang Diterima" value={formatIDR(payment.received_amount)} />
                  <SummaryLine label="Kembalian" value={formatIDR(payment.change_amount)} bold />
                </>
              ) : (
                <SummaryLine label="No. Referensi" value={payment.reference_number ?? '—'} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-end justify-between border-t border-ink-200 pt-6">
        <div className="max-w-[340px]">
          <p className="whitespace-pre-line text-[12px] leading-relaxed text-ink-600">{settings.receipt_footer}</p>
          <p className="mt-3 text-[10.5px] text-ink-400">
            Faktur ini sah dan diproses oleh komputer. Dicetak pada {formatDate(new Date())} {formatTime(new Date())}.
          </p>
        </div>
        <div className="text-center">
          <div className="h-16 w-40 border-b border-ink-300" />
          <p className="mt-2 text-[11.5px] font-semibold text-ink-600">{order.cashier_name}</p>
          <p className="text-[10.5px] text-ink-400">Kasir Bertugas</p>
        </div>
      </div>
    </div>
  )
}

function SummaryLine({ label, value, negative, bold }: { label: string; value: string; negative?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12.5px] text-ink-600">{label}</span>
      <span
        className={`text-[13px] tnum ${bold ? 'font-extrabold text-ink-900' : 'font-semibold'} ${
          negative ? 'text-danger-600' : 'text-ink-800'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
