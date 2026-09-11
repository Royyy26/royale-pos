import { useState } from 'react'
import { FileText, Printer, Undo2, XCircle } from 'lucide-react'
import { Drawer, ConfirmDialog } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/primitives'
import { StatRow } from '@/components/ui/StatCard'
import { formatDateTime, formatIDR } from '@/lib/utils'
import { ORDER_TYPE_LABEL, OrderStatusBadge, PaymentBadge } from '@/lib/labels'
import { printer } from '@/hardware'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Order } from '@/types'
import { InvoiceA4, ThermalReceipt } from '../pos/Receipt'
import { Glyph } from '@/lib/glyphs'

export function OrderDetailDrawer({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const db = useDataStore((s) => s.db)
  const cancelOrder = useDataStore((s) => s.cancelOrder)
  const refundOrder = useDataStore((s) => s.refundOrder)
  const markPrinted = useDataStore((s) => s.markInvoicePrinted)
  const user = useAuthStore((s) => s.user)!
  const has = useAuthStore((s) => s.has)

  const [voidOpen, setVoidOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (!order) return null

  const payment = db.payments.find((p) => p.order_id === order.id) ?? null
  const invoice = db.invoices.find((i) => i.order_id === order.id)
  const invoiceNumber = invoice?.invoice_number ?? order.order_number.replace('ORD', 'INV')

  const printable = {
    order,
    payment,
    invoiceNumber,
    cashier: { id: order.cashier_id, name: order.cashier_name },
    settings: db.settings,
  }

  const canModify = order.status !== 'cancelled' && order.status !== 'refunded'

  /*
    Refund hanya untuk pesanan yang uangnya benar-benar sudah diterima. Bill
    meja yang masih berjalan belum punya pembayaran sama sekali, jadi
    "mengembalikan dana" di sana hanya akan menghapus tagihan tanpa ada uang
    yang kembali. Untuk membatalkan bill yang belum dibayar, pakai void.
  */
  const sudahDibayar = db.payments.some((p) => p.order_id === order.id && p.status === 'success')
  const canRefund = canModify && sudahDibayar

  return (
    <>
      <Drawer
        open={!!order}
        onClose={onClose}
        title={order.order_number}
        subtitle={`${formatDateTime(order.created_at)} · ${order.cashier_name}`}
        width="max-w-xl"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={async () => {
                await printer().printReceipt(printable)
                markPrinted(order.id)
                toast.info('Perintah cetak struk dikirim')
              }}
            >
              Cetak Struk
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={async () => {
                await printer().printInvoiceA4(printable)
                markPrinted(order.id)
                toast.info('Perintah cetak faktur A4 dikirim')
              }}
            >
              Faktur A4
            </Button>
            {canRefund && has('pos.refund') && (
              <Button variant="danger-soft" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => setRefundOpen(true)}>
                Refund
              </Button>
            )}
            {canModify && has('pos.void') && (
              <Button variant="danger" className="ml-auto" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setVoidOpen(true)}>
                Void
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {payment && <PaymentBadge method={payment.method} />}
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
              {ORDER_TYPE_LABEL[order.type]}
            </span>
            {order.table_name && (
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                {order.table_name}
              </span>
            )}
          </div>

          {(order.cancel_reason || order.refund_reason) && (
            <div className="rounded-xl bg-danger-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-danger-700">
                {order.cancel_reason ? 'Alasan Pembatalan' : 'Alasan Refund'}
              </p>
              <p className="mt-1 text-[13px] text-danger-800">{order.cancel_reason ?? order.refund_reason}</p>
            </div>
          )}

          <div>
            <p className="section-title mb-3">Item Pesanan</p>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-xl border border-ink-200 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-lg">
                    <Glyph name={item.emoji} className="h-4 w-4 text-ink-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-ink-900">{item.product_name}</p>
                    <p className="mt-0.5 text-[12px] tnum text-ink-500">
                      {item.quantity} × {formatIDR(item.price)}
                    </p>
                    {item.note && (
                      <p className="mt-1 inline-block rounded-md bg-warning-50 px-1.5 py-0.5 text-[11px] font-medium text-warning-700">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <span className="text-[14px] figure text-ink-900">{formatIDR(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="section-title mb-2">Ringkasan Tagihan</p>
            <div className="divide-y divide-ink-100 rounded-xl border border-ink-200 px-4">
              <StatRow label="Subtotal" value={formatIDR(order.subtotal)} />
              {order.discount_amount > 0 && (
                <StatRow
                  label={`Diskon${order.discount_note ? ` · ${order.discount_note}` : ''}`}
                  value={`-${formatIDR(order.discount_amount)}`}
                  tone="danger"
                />
              )}
              {order.service_amount > 0 && (
                <StatRow label={`Service ${db.settings.service_percent}%`} value={formatIDR(order.service_amount)} />
              )}
              {order.tax_amount > 0 && <StatRow label={`PPN ${db.settings.tax_percent}%`} value={formatIDR(order.tax_amount)} />}
              <StatRow label="Total" value={formatIDR(order.total)} bold />
            </div>
          </div>

          {payment && (
            <div>
              <p className="section-title mb-2">Pembayaran</p>
              <div className="divide-y divide-ink-100 rounded-xl border border-ink-200 px-4">
                <StatRow label="Metode" value={payment.method.toUpperCase()} />
                <StatRow label="Dibayar" value={formatIDR(payment.received_amount)} />
                <StatRow label="Kembalian" value={formatIDR(payment.change_amount)} />
                {payment.reference_number && <StatRow label="Referensi" value={payment.reference_number} />}
                <StatRow label="Waktu Bayar" value={formatDateTime(payment.paid_at)} />
              </div>
            </div>
          )}

          {order.note && (
            <div className="rounded-xl bg-ink-100 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Catatan Pesanan</p>
              <p className="mt-1 text-[13px] text-ink-700">{order.note}</p>
            </div>
          )}

          <div>
            <p className="section-title mb-3">Pratinjau Struk</p>
            <div className="rounded-2xl bg-ink-100 p-4">
              <ThermalReceipt order={order} payment={payment} invoiceNumber={invoiceNumber} settings={db.settings} />
            </div>
          </div>
        </div>

        {/* Area cetak */}
        <div className="hidden">
          <ThermalReceipt
            order={order}
            payment={payment}
            invoiceNumber={invoiceNumber}
            settings={db.settings}
            screen={false}
          />
          <InvoiceA4 order={order} payment={payment} invoiceNumber={invoiceNumber} settings={db.settings} />
        </div>
      </Drawer>

      <ConfirmDialog
        open={voidOpen}
        onClose={() => {
          setVoidOpen(false)
          setReason('')
        }}
        onConfirm={() => {
          if (reason.trim().length < 4) {
            toast.error('Alasan wajib diisi', 'Minimal 4 karakter untuk keperluan audit.')
            return
          }
          cancelOrder(order.id, reason, user)
          setVoidOpen(false)
          setReason('')
          onClose()
          toast.warning('Transaksi dibatalkan', `${order.order_number} telah di-void dan stok dikembalikan.`)
        }}
        title="Void transaksi ini?"
        description="Transaksi akan dibatalkan, pembayaran ditandai refund, dan stok produk dikembalikan."
        confirmLabel="Ya, void transaksi"
      >
        <Input label="Alasan void" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. salah input menu" autoFocus />
      </ConfirmDialog>

      <ConfirmDialog
        open={refundOpen}
        onClose={() => {
          setRefundOpen(false)
          setReason('')
        }}
        onConfirm={() => {
          if (reason.trim().length < 4) {
            toast.error('Alasan wajib diisi', 'Minimal 4 karakter untuk keperluan audit.')
            return
          }
          refundOrder(order.id, reason, user)
          setRefundOpen(false)
          setReason('')
          onClose()
          toast.warning('Refund diproses', `${order.order_number} ditandai sebagai refund.`)
        }}
        title="Proses refund transaksi?"
        description={
          <>
            Dana sebesar <b className="tnum">{formatIDR(order.total)}</b> akan ditandai sebagai refund dan
            dikurangkan dari rekap penjualan hari ini. Stok tidak dikembalikan, karena pesanan sudah
            disajikan. Gunakan void bila pesanan batal sebelum disajikan.
          </>
        }
        confirmLabel="Ya, proses refund"
        tone="warning"
      >
        <Input
          label="Alasan refund"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="mis. pesanan tidak sesuai"
          autoFocus
        />
      </ConfirmDialog>
    </>
  )
}
