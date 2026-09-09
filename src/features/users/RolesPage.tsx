import { useEffect, useState } from 'react'
import { Save, ShieldCheck, Undo2 } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card, Switch } from '@/components/ui/primitives'
import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/utils'
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_META, ROLE_PERMISSIONS } from '@/lib/rbac'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { Permission, RoleName } from '@/types'

export function RolesPage() {
  const db = useDataStore((s) => s.db)
  const updateRolePermissions = useDataStore((s) => s.updateRolePermissions)
  const actor = useAuthStore((s) => s.user)!

  const [active, setActive] = useState<RoleName>('kasir')
  const [draft, setDraft] = useState<Permission[]>([])

  const role = db.roles.find((r) => r.id === active)!

  useEffect(() => {
    setDraft(role?.permissions ?? [])
  }, [active, role?.permissions.length])

  const dirty =
    draft.length !== role.permissions.length || draft.some((p) => !role.permissions.includes(p))

  const toggle = (permission: Permission) =>
    setDraft((d) => (d.includes(permission) ? d.filter((p) => p !== permission) : [...d, permission]))

  const save = () => {
    updateRolePermissions(active, draft, actor)
    toast.success('Hak akses diperbarui', `Perubahan pada role ${ROLE_META[active].label} langsung berlaku.`)
  }

  const userCount = (r: RoleName) => db.users.filter((u) => u.role_id === r).length

  return (
    <Page
      title="Role & Hak Akses"
      subtitle="Kelola izin granular untuk setiap role pengguna"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => setDraft(role.permissions)} disabled={!dirty}>
            Kembalikan
          </Button>
          <Button leftIcon={<Save className="h-4 w-4" />} onClick={save} disabled={!dirty}>
            Simpan Perubahan
          </Button>
        </div>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {(['owner', 'kasir', 'warehouse'] as RoleName[]).map((r) => {
          const meta = ROLE_META[r]
          const perms = db.roles.find((x) => x.id === r)?.permissions.length ?? 0
          return (
            <button
              key={r}
              onClick={() => setActive(r)}
              className={cn(
                'card card-hover p-5 text-left transition-all',
                active === r && 'ring-2 ring-brand-500 ring-offset-2',
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn('grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white', meta.color)}>
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold tnum text-ink-600">
                  {userCount(r)} pengguna
                </span>
              </div>
              <p className="mt-4 text-[16px] font-bold text-ink-900">{meta.label}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-500">{meta.description}</p>
              <p className="mt-3 text-[12px] font-semibold text-brand-600">{perms} izin aktif</p>
            </button>
          )
        })}
      </div>

      {dirty && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-warning-500" />
          <p className="text-[13px] font-semibold text-warning-800">
            Terdapat perubahan yang belum disimpan pada role {ROLE_META[active].label}.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <Card key={group.label} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">{group.label}</h3>
              <span className="text-[12px] font-semibold tnum text-ink-400">
                {group.items.filter((p) => draft.includes(p)).length}/{group.items.length}
              </span>
            </div>
            <div className="space-y-3.5">
              {group.items.map((permission) => {
                const isDefault = ROLE_PERMISSIONS[active].includes(permission)
                return (
                  <div key={permission} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink-800">{PERMISSION_LABELS[permission]}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-400">{permission}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!isDefault && draft.includes(permission) && (
                        <span className="rounded-md bg-info-50 px-1.5 py-0.5 text-[10px] font-bold text-info-700">Kustom</span>
                      )}
                      <Switch checked={draft.includes(permission)} onChange={() => toggle(permission)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 p-5">
        <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Catatan Keamanan</h3>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-600">
          <li className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            Perubahan hak akses langsung memengaruhi menu sidebar dan tombol aksi pengguna terkait.
          </li>
          <li className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            Setiap perubahan tercatat pada audit log dengan aksi <b>Perubahan Hak Akses</b>.
          </li>
          <li className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            Sebaiknya role Owner tetap memiliki seluruh izin agar sistem selalu dapat dikelola.
          </li>
        </ul>
      </Card>
    </Page>
  )
}
