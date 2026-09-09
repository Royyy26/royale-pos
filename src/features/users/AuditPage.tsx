import { useMemo, useState } from 'react'
import { Download, ScrollText, ShieldAlert } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Avatar, Badge, Card, EmptyState, SearchInput, Select, Table, Td, Th } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate, formatDateTime, formatTimeSeconds, isSameDay, toInputDate } from '@/lib/utils'
import { AUDIT_LABEL, AUDIT_TONE } from '@/lib/labels'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { AuditAction } from '@/types'
import { Pagination } from '../orders/OrdersPage'

const PAGE_SIZE = 20

const SENSITIVE: AuditAction[] = ['transaction_cancelled', 'refund', 'price_change', 'permission_change', 'stock_adjustment']

export function AuditPage() {
  const db = useDataStore((s) => s.db)
  const [query, setQuery] = useState('')
  const [action, setAction] = useState<AuditAction | 'all'>('all')
  const [userId, setUserId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.audit_logs
      .filter((l) => (action === 'all' ? true : l.action === action))
      .filter((l) => (userId === 'all' ? true : l.user_id === userId))
      .filter((l) => {
        if (!from && !to) return true
        const t = new Date(l.created_at).getTime()
        if (from && t < new Date(`${from}T00:00:00`).getTime()) return false
        if (to && t > new Date(`${to}T23:59:59`).getTime()) return false
        return true
      })
      .filter((l) => (q ? l.description.toLowerCase().includes(q) || l.user_name.toLowerCase().includes(q) : true))
  }, [db.audit_logs, action, userId, from, to, query])

  const todayCount = db.audit_logs.filter((l) => isSameDay(l.created_at, new Date())).length
  const sensitiveCount = db.audit_logs.filter((l) => SENSITIVE.includes(l.action)).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const exportCsv = () => {
    const header = ['Waktu', 'Pengguna', 'Aksi', 'Deskripsi', 'Referensi', 'IP']
    const lines = filtered.map((l) =>
      [formatDateTime(l.created_at), l.user_name, AUDIT_LABEL[l.action], l.description, l.reference_id ?? '', l.ip_address].join(';'),
    )
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${toInputDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit log diekspor')
  }

  return (
    <Page
      title="Audit Log"
      subtitle="Jejak seluruh aktivitas penting pada sistem"
      actions={
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Ekspor CSV
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Aktivitas" value={db.audit_logs.length} tone="brand" compact icon={<ScrollText className="h-5 w-5" />} />
        <StatCard label="Aktivitas Hari Ini" value={todayCount} tone="info" compact />
        <StatCard label="Aktivitas Sensitif" value={sensitiveCount} tone="amber" compact icon={<ShieldAlert className="h-5 w-5" />} sublabel="Void, refund, harga, hak akses" />
      </div>

      <Card className="mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <SearchInput value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Cari deskripsi atau pengguna…" />
          <Select
            value={action}
            onChange={(e) => { setAction(e.target.value as AuditAction | 'all'); setPage(1) }}
            options={[
              { value: 'all', label: 'Semua Aksi' },
              ...(Object.keys(AUDIT_LABEL) as AuditAction[]).map((a) => ({ value: a, label: AUDIT_LABEL[a] })),
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
          <EmptyState icon={<ScrollText className="h-7 w-7" />} title="Tidak ada catatan" description="Belum ada aktivitas yang sesuai dengan filter ini." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Waktu</Th>
                  <Th>Pengguna</Th>
                  <Th align="center">Aksi</Th>
                  <Th>Deskripsi</Th>
                  <Th>Referensi</Th>
                  <Th align="right">IP Address</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const user = db.users.find((u) => u.id === l.user_id)
                  return (
                    <tr key={l.id} className="transition-colors hover:bg-ink-50/60">
                      <Td className="whitespace-nowrap">
                        <p className="text-[12.5px] font-semibold text-ink-800">{formatDate(l.created_at)}</p>
                        <p className="text-[11.5px] tnum text-ink-400">{formatTimeSeconds(l.created_at)}</p>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={l.user_name} gradient={user?.avatar_color} size="sm" />
                          <span className="text-[13px] font-semibold text-ink-800">{l.user_name}</span>
                        </div>
                      </Td>
                      <Td align="center">
                        <Badge tone={AUDIT_TONE[l.action]}>{AUDIT_LABEL[l.action]}</Badge>
                      </Td>
                      <Td className="max-w-[360px] text-[12.5px] text-ink-600">{l.description}</Td>
                      <Td className="max-w-[140px] truncate font-mono text-[11.5px] text-ink-400">{l.reference_id ?? '—'}</Td>
                      <Td align="right" className="font-mono text-[11.5px] tnum text-ink-400">{l.ip_address}</Td>
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
