import { useMemo, useState } from 'react'
import { Archive, ArrowDownToLine, ArrowUpFromLine, Download } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, SearchInput, Select, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatDateTime, formatNumber, toInputDate } from '@/lib/utils'
import { MOVEMENT_LABEL, MovementBadge } from '@/lib/labels'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { StockMovementType } from '@/types'
import { Pagination } from '../orders/OrdersPage'
import { Glyph } from '@/lib/glyphs'

const PAGE_SIZE = 20

export function StockMovementPage() {
  const db = useDataStore((s) => s.db)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<StockMovementType | 'all'>('all')
  const [userId, setUserId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const productMap = useMemo(() => new Map(db.products.map((p) => [p.id, p])), [db.products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.stock_movements
      .filter((m) => (type === 'all' ? true : m.type === type))
      .filter((m) => (userId === 'all' ? true : m.user_id === userId))
      .filter((m) => {
        if (!from && !to) return true
        const t = new Date(m.created_at).getTime()
        if (from && t < new Date(`${from}T00:00:00`).getTime()) return false
        if (to && t > new Date(`${to}T23:59:59`).getTime()) return false
        return true
      })
      .filter((m) => {
        if (!q) return true
        const product = productMap.get(m.product_id)
        return (product?.name.toLowerCase().includes(q) ?? false) || m.reason.toLowerCase().includes(q)
      })
  }, [db.stock_movements, type, userId, from, to, query, productMap])

  const totalIn = filtered.filter((m) => m.quantity_change > 0).reduce((a, m) => a + m.quantity_change, 0)
  const totalOut = filtered.filter((m) => m.quantity_change < 0).reduce((a, m) => a + Math.abs(m.quantity_change), 0)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const exportCsv = () => {
    const header = ['Waktu', 'Produk', 'Jenis', 'Sebelum', 'Perubahan', 'Sesudah', 'Alasan', 'Pengguna', 'Referensi']
    const lines = filtered.map((m) =>
      [
        formatDateTime(m.created_at),
        productMap.get(m.product_id)?.name ?? m.product_id,
        MOVEMENT_LABEL[m.type],
        m.quantity_before,
        m.quantity_change,
        m.quantity_after,
        m.reason,
        m.user_name,
        m.reference_id ?? '',
      ].join(';'),
    )
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pergerakan-stok-${toInputDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Riwayat pergerakan diekspor')
  }

  return (
    <Page
      title="Pergerakan Stok"
      subtitle={`${filtered.length} aktivitas tercatat`}
      actions={
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Ekspor CSV
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Aktivitas" value={formatNumber(filtered.length)} tone="brand" compact icon={<Archive className="h-5 w-5" />} />
        <StatCard label="Unit Masuk" value={`+${formatNumber(totalIn)}`} tone="success" compact icon={<ArrowDownToLine className="h-5 w-5" />} />
        <StatCard label="Unit Keluar" value={`-${formatNumber(totalOut)}`} tone="danger" compact icon={<ArrowUpFromLine className="h-5 w-5" />} />
      </div>

      <Card className="mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <SearchInput value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Cari produk atau alasan…" />
          <Select
            value={type}
            onChange={(e) => { setType(e.target.value as StockMovementType | 'all'); setPage(1) }}
            options={[
              { value: 'all', label: 'Semua Jenis' },
              ...(Object.keys(MOVEMENT_LABEL) as StockMovementType[]).map((t) => ({ value: t, label: MOVEMENT_LABEL[t] })),
            ]}
          />
          <Select
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1) }}
            options={[{ value: 'all', label: 'Semua Pengguna' }, ...db.users.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              className="h-11 w-full rounded-xl border border-ink-300 px-3 text-[13px] outline-none focus:border-brand-500"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
              className="h-11 w-full rounded-xl border border-ink-300 px-3 text-[13px] outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<Archive className="h-7 w-7" />} title="Tidak ada pergerakan" description="Belum ada aktivitas stok yang cocok dengan filter ini." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Waktu</Th>
                  <Th>Produk</Th>
                  <Th align="center">Jenis</Th>
                  <Th align="right">Sebelum</Th>
                  <Th align="right">Perubahan</Th>
                  <Th align="right">Sesudah</Th>
                  <Th>Alasan</Th>
                  <Th>Pengguna</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const product = productMap.get(m.product_id)
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-ink-50/60">
                      <Td className="whitespace-nowrap text-[12.5px] text-ink-600">{formatDateTime(m.created_at)}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100">
                            <Glyph name={product?.emoji} className="h-4 w-4 text-ink-600" />
                          </span>
                          <span className="text-[13px] font-semibold text-ink-900">{product?.name ?? m.product_id}</span>
                        </div>
                      </Td>
                      <Td align="center">
                        <MovementBadge type={m.type} />
                      </Td>
                      <Td align="right" className="tnum text-ink-500">{m.quantity_before || '—'}</Td>
                      <Td align="right" className={cn('figure', m.quantity_change > 0 ? 'text-success-600' : 'text-danger-600')}>
                        {m.quantity_change > 0 ? '+' : ''}
                        {m.quantity_change}
                      </Td>
                      <Td align="right" className="tnum font-semibold text-ink-900">{m.quantity_after || '—'}</Td>
                      <Td className="max-w-[240px] truncate text-[12.5px] text-ink-600">{m.reason}</Td>
                      <Td className="whitespace-nowrap text-[12.5px] text-ink-600">{m.user_name}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination page={current} totalPages={totalPages} total={filtered.length} onChange={setPage} />
          </>
        )}
      </Card>
    </Page>
  )
}
