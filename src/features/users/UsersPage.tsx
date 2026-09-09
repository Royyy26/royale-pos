import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Avatar, Badge, Card, EmptyState, Input, SearchInput, Select, Switch, Table, Td, Th } from '@/components/ui/primitives'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { cn, formatDateTime, formatIDR, uid } from '@/lib/utils'
import { ROLE_META } from '@/lib/rbac'
import { isRevenueOrder } from '@/lib/analytics'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { RoleName, User } from '@/types'

const AVATARS = [
  'from-brand-400 to-brand-600',
  'from-plum-500 to-plum-700',
  'from-info-500 to-info-700',
  'from-danger-500 to-danger-700',
  'from-warning-500 to-warning-700',
  'from-success-500 to-success-700',
]

const empty = (): User => ({
  id: uid('user'),
  name: '',
  username: '',
  pin: '',
  email: '',
  phone: '',
  role_id: 'kasir',
  avatar_color: AVATARS[0],
  status: 'active',
  last_login_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export function UsersPage() {
  const db = useDataStore((s) => s.db)
  const saveUser = useDataStore((s) => s.saveUser)
  const deleteUser = useDataStore((s) => s.deleteUser)
  const actor = useAuthStore((s) => s.user)!

  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleName | 'all'>('all')
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const stats = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    for (const o of db.orders) {
      if (!isRevenueOrder(o)) continue
      const entry = map.get(o.cashier_id) ?? { orders: 0, revenue: 0 }
      entry.orders += 1
      entry.revenue += o.total
      map.set(o.cashier_id, entry)
    }
    return map
  }, [db.orders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.users
      .filter((u) => (role === 'all' ? true : u.role_id === role))
      .filter((u) => (q ? u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) : true))
  }, [db.users, role, query])

  return (
    <Page
      title="Manajemen Pengguna"
      subtitle={`${db.users.length} pengguna terdaftar`}
      actions={
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(empty())}>
          Tambah Pengguna
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Pengguna" value={db.users.length} tone="brand" compact icon={<Users className="h-5 w-5" />} />
        <StatCard label="Owner" value={db.users.filter((u) => u.role_id === 'owner').length} tone="violet" compact />
        <StatCard label="Kasir" value={db.users.filter((u) => u.role_id === 'kasir').length} tone="info" compact />
        <StatCard label="Warehouse" value={db.users.filter((u) => u.role_id === 'warehouse').length} tone="amber" compact />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, username, atau email…" />
          </div>
          <div className="w-52">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleName | 'all')}
              options={[
                { value: 'all', label: 'Semua Role' },
                { value: 'owner', label: 'Owner' },
                { value: 'kasir', label: 'Kasir' },
                { value: 'warehouse', label: 'Warehouse' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title="Pengguna tidak ditemukan" description="Sesuaikan pencarian atau filter role." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Pengguna</Th>
                <Th>Kontak</Th>
                <Th align="center">Role</Th>
                <Th align="center">Status</Th>
                <Th align="right">Transaksi</Th>
                <Th align="right">Total Penjualan</Th>
                <Th align="right">Login Terakhir</Th>
                <Th align="center">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const meta = ROLE_META[u.role_id]
                const stat = stats.get(u.id)
                return (
                  <tr key={u.id} className="transition-colors hover:bg-ink-50/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} gradient={u.avatar_color} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink-900">{u.name}</p>
                          <p className="truncate text-[11.5px] text-ink-400">@{u.username}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[12.5px] text-ink-600">{u.email}</p>
                      <p className="text-[11.5px] tnum text-ink-400">{u.phone}</p>
                    </Td>
                    <Td align="center">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', meta.badge)}>
                        {meta.label}
                      </span>
                    </Td>
                    <Td align="center">
                      <Badge tone={u.status === 'active' ? 'success' : u.status === 'inactive' ? 'neutral' : 'danger'} dot>
                        {u.status === 'active' ? 'Aktif' : u.status === 'inactive' ? 'Nonaktif' : 'Ditangguhkan'}
                      </Badge>
                    </Td>
                    <Td align="right" className="tnum font-semibold text-ink-800">{stat?.orders ?? 0}</Td>
                    <Td align="right" className="figure text-ink-900">{formatIDR(stat?.revenue ?? 0)}</Td>
                    <Td align="right" className="text-[12px] text-ink-500">
                      {u.last_login_at ? formatDateTime(u.last_login_at) : 'Belum pernah'}
                    </Td>
                    <Td align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(u)} aria-label="Ubah">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger-500 hover:bg-danger-50"
                          onClick={() => setDeleting(u)}
                          disabled={u.id === actor.id}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <UserFormModal
        user={editing}
        existingUsernames={db.users.filter((u) => u.id !== editing?.id).map((u) => u.username.toLowerCase())}
        onClose={() => setEditing(null)}
        onSave={(u) => {
          saveUser(u, actor)
          setEditing(null)
          toast.success('Pengguna tersimpan', `${u.name} · ${ROLE_META[u.role_id].label}`)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteUser(deleting.id, actor)
          toast.warning('Pengguna dihapus', `${deleting.name} tidak dapat lagi masuk ke sistem.`)
          setDeleting(null)
        }}
        title="Hapus pengguna ini?"
        description={<>Akun <b>{deleting?.name}</b> akan dihapus. Riwayat transaksi yang pernah dibuat tetap tersimpan.</>}
        confirmLabel="Ya, hapus"
      />
    </Page>
  )
}

function UserFormModal({
  user,
  existingUsernames,
  onClose,
  onSave,
}: {
  user: User | null
  existingUsernames: string[]
  onClose: () => void
  onSave: (user: User) => void
}) {
  const [form, setForm] = useState<User | null>(user)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm(user)
    setErrors({})
  }, [user])

  if (!form) return null

  const set = <K extends keyof User,>(key: K, value: User[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const submit = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Nama wajib diisi.'
    if (!form.username.trim()) next.username = 'Username wajib diisi.'
    else if (existingUsernames.includes(form.username.trim().toLowerCase())) next.username = 'Username sudah digunakan.'
    if (form.pin.length < 4) next.pin = 'PIN minimal 4 digit.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Format email tidak valid.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSave(form)
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      size="lg"
      title={user?.name ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'}
      subtitle="Role menentukan menu dan aksi yang dapat diakses pengguna."
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button fullWidth onClick={submit}>
            Simpan Pengguna
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nama lengkap" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} placeholder="mis. Dinda Pratiwi" />
        <Input
          label="Username"
          value={form.username}
          onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s+/g, ''))}
          error={errors.username}
          placeholder="mis. dinda"
        />
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} placeholder="nama@royale.id" />
        <Input label="Nomor telepon" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0812-xxxx-xxxx" inputClassName="tnum" />
        <Input
          label="PIN (4-6 digit)"
          inputMode="numeric"
          value={form.pin}
          onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={errors.pin}
          placeholder="••••"
          className="tnum tracking-[0.3em]"
        />
        <Select
          label="Status akun"
          value={form.status}
          onChange={(e) => set('status', e.target.value as User['status'])}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
            { value: 'suspended', label: 'Ditangguhkan' },
          ]}
        />
      </div>

      <div className="mt-5">
        <p className="mb-2.5 text-[13px] font-semibold text-ink-700">Role pengguna</p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {(['owner', 'kasir', 'warehouse'] as RoleName[]).map((r) => {
            const meta = ROLE_META[r]
            return (
              <button
                key={r}
                onClick={() => set('role_id', r)}
                className={cn(
                  'rounded-2xl border-2 p-4 text-left transition-all active:scale-[.98]',
                  form.role_id === r ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
                )}
              >
                <span className={cn('grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white', meta.color)}>
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <p className={cn('mt-3 text-[14px] font-bold', form.role_id === r ? 'text-brand-700' : 'text-ink-900')}>{meta.label}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-500">{meta.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Warna avatar</p>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => set('avatar_color', a)}
              className={cn(
                'h-11 w-11 rounded-full bg-gradient-to-br transition-all active:scale-95',
                a,
                form.avatar_color === a ? 'ring-2 ring-ink-900 ring-offset-2' : '',
              )}
              aria-label="Pilih warna avatar"
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}
