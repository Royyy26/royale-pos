import { useMemo, useState } from 'react'
import { Download, Eye, Filter, ListOrdered, RotateCcw } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, SearchInput, Select, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatDateTime, formatIDR, toInputDate } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, OrderStatusBadge, OrderTypeBadge, PAYMENT_LABEL, PaymentBadge } from '@/lib/labels'
import { summarize } from '@/lib/analytics'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Order, OrderStatus, OrderType, PaymentMethodCode } from '@/types'
import { OrderDetailDrawer } from './OrderDetailDrawer'

const PAGE_SIZE = 15

export function OrdersPage() {
  const db = useDataStore((s) => s.db)
  const user = useAuthStore((s) => s.user)!
  const has = useAuthStore((s) => s.has)

  const canSeeAll = has('order.view.all')

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [type, setType] = useState<OrderType | 'all'>('all')
  const [method, setMethod] = useState<PaymentMethodCode | 'all'>('all')
  const [cashier, setCashier] = useState<string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Order | null>(null)

  const paymentByOrder = useMemo(() => {
    const map = new Map<string, PaymentMethodCode>()
    for (const p of db.payments) map.set(p.order_id, p.method)
    return map
  }, [db.payments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.orders
      .filter((o) => (canSeeAll ? true : o.cashier_id === user.id))
      .filter((o) => (status === 'all' ? true : o.status === status))
      .filter((o) => (type === 'all' ? true : o.type === type))
      .filter((o) => (cashier === 'all' ? true : o.cashier_id === cashier))
      .filter((o) => (method === 'all' ? true : paymentByOrder.get(o.id) === method))
      .filter((o) => {
        if (!from && !to) return true
        const t = new Date(o.created_at).getTime()
        if (from && t < new Date(`${from}T00:00:00`).getTime()) return false
        if (to && t > new Date(`${to}T23:59:59`).getTime()) return false
        return true
      })
      .filter((o) =>
        q
          ? o.order_number.toLowerCase().includes(q) ||
            o.customer_name.toLowerCase().includes(q) ||
            o.cashier_name.toLowerCase().includes(q) ||
            (o.table_name ?? '').toLowerCase().includes(q)
          : true,
      )
  }, [db.orders, canSeeAll, user.id, status, type, cashier, method, from, to, query, paymentByOrder])

  const summary = useMemo(() => summarize(filtered), [filtered])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const resetFilters = () => {
    setQuery('')
    setStatus('all')
    setType('all')
    setMethod('all')
    setCashier('all')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const exportCsv = () => {
    const header = ['No Pesanan', 'Tanggal', 'Tipe', 'Meja', 'Pelanggan', 'Kasir', 'Metode', 'Status', 'Subtotal', 'Diskon', 'Pajak', 'Service', 'Total']
    const lines = filtered.map((o) =>
      [
        o.order_number,
        formatDateTime(o.created_at),
        ORDER_TYPE_LABEL[o.type],
        o.table_name ?? '',
        o.customer_name,
        o.cashier_name,
        PAYMENT_LABEL[paymentByOrder.get(o.id) ?? 'cash'],
        ORDER_STATUS_LABEL[o.status],
        o.subtotal,
        o.discount_amount,
        o.tax_amount,
        o.service_amount,
        o.total,
      ].join(';'),
    )
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pesanan-${toInputDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Ekspor selesai', `${filtered.length} baris tersimpan sebagai CSV.`)
  }

  return (
    <Page
      title="Manajemen Pesanan"
      subtitle={canSeeAll ? 'Seluruh pesanan dari semua kasir' : 'Pesanan yang Anda proses'}
      actions={
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Ekspor CSV
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pesanan Ditemukan" value={filtered.length} tone="brand" compact icon={<ListOrdered className="h-5 w-5" />} />
        <StatCard label="Total Nilai" value={formatIDR(summary.revenue)} tone="info" compact />
        <StatCard label="Refund" value={`${summary.refundCount} · ${formatIDR(summary.refundTotal)}`} tone={summary.refundCount ? 'danger' : 'neutral'} compact />
        <StatCard label="Dibatalkan" value={`${summary.voidCount} · ${formatIDR(summary.voidTotal)}`} tone={summary.voidCount ? 'amber' : 'neutral'} compact />
      </div>

      {/* Filter */}
      <Card className="mb-5 p-4">
        <div className="flex items-center gap-2 pb-3">
          <Filter className="h-4 w-4 text-ink-400" />
          <span className="text-[13px] font-bold text-ink-700">Filter Pencarian</span>
          <Button variant="ghost" size="sm" className="ml-auto" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={resetFilters}>
            Reset
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-4 xl:grid-cols-8">
          <div className="lg:col-span-2 xl:col-span-2">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Cari no. pesanan, pelanggan, meja..."
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | 'all')
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'Semua Status' },
              ...(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] })),
            ]}
          />
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as OrderType | 'all')
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'Semua Tipe' },
              { value: 'dine_in', label: 'Dine In' },
              { value: 'take_away', label: 'Take Away' },
              { value: 'delivery', label: 'Delivery' },
            ]}
          />
          <Select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as PaymentMethodCode | 'all')
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'Semua Metode' },
              { value: 'cash', label: 'Tunai' },
              { value: 'qris', label: 'QRIS' },
              { value: 'transfer', label: 'Transfer' },
              { value: 'card', label: 'Kartu' },
            ]}
          />
          {canSeeAll && (
            <Select
              value={cashier}
              onChange={(e) => {
                setCashier(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'all', label: 'Semua Kasir' },
                ...db.users.filter((u) => u.role_id !== 'warehouse').map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          )}
          <div className="flex gap-2 lg:col-span-2 xl:col-span-2">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
              }}
              className="h-11 w-full min-w-0 rounded-xl border border-ink-300 px-3 text-[13px] text-ink-800 outline-none focus:border-brand-500"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
              }}
              className="h-11 w-full min-w-0 rounded-xl border border-ink-300 px-3 text-[13px] text-ink-800 outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={<ListOrdered className="h-7 w-7" />}
            title="Tidak ada pesanan ditemukan"
            description="Ubah kata kunci atau filter untuk melihat pesanan lainnya."
            action={
              <Button variant="outline" onClick={resetFilters}>
                Reset filter
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>No. Pesanan</Th>
                  <Th>Waktu</Th>
                  <Th>Tipe</Th>
                  <Th>Pelanggan / Meja</Th>
                  <Th>Kasir</Th>
                  <Th>Metode</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Total</Th>
                  <Th align="center">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const pm = paymentByOrder.get(o.id)
                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer transition-colors hover:bg-ink-50/70"
                      onClick={() => setSelected(o)}
                    >
                      <Td>
                        <p className="text-[13px] font-bold text-ink-900">{o.order_number}</p>
                        <p className="text-[11px] text-ink-400">
                          {o.items.length} jenis · {o.items.reduce((a, i) => a + i.quantity, 0)} porsi
                        </p>
                      </Td>
                      <Td className="text-[12.5px] text-ink-600">{formatDateTime(o.created_at)}</Td>
                      <Td>
                        <OrderTypeBadge type={o.type} />
                      </Td>
                      <Td className="text-[12.5px] text-ink-600">
                        {o.customer_name || '-'}
                        {o.table_name && <span className="ml-1 text-ink-400">({o.table_name})</span>}
                      </Td>
                      <Td className="text-[12.5px] text-ink-600">{o.cashier_name}</Td>
                      <Td>{pm ? <PaymentBadge method={pm} /> : <span className="text-ink-400">-</span>}</Td>
                      <Td align="center">
                        <OrderStatusBadge status={o.status} />
                      </Td>
                      <Td align="right" className="text-[13.5px] figure text-ink-900">
                        {formatIDR(o.total)}
                      </Td>
                      <Td align="center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(o)
                          }}
                          aria-label="Lihat detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>

            <Pagination page={current} totalPages={totalPages} total={filtered.length} onChange={setPage} />
          </>
        )}
      </Card>

      <OrderDetailDrawer order={selected} onClose={() => setSelected(null)} />
    </Page>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3.5">
      <p className="text-[12.5px] text-ink-500">
        Halaman <b className="text-ink-800">{page}</b> dari {totalPages} · {total} data
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Sebelumnya
        </Button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-400">...</span>}
            <button
              onClick={() => onChange(p)}
              className={cn(
                'h-8 min-w-8 rounded-lg px-2 text-[12.5px] font-bold transition-colors',
                p === page ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100',
              )}
            >
              {p}
            </button>
          </span>
        ))}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  )
}
