import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, Clock, LogOut, Menu, ShoppingCart, TriangleAlert } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui/primitives'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Modal'
import { ROLE_META } from '@/lib/rbac'
import { formatDateFull, formatIDR, formatTimeSeconds } from '@/lib/utils'
import { stockStatusOf } from '@/lib/labels'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="hidden items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-inset ring-ink-200 lg:flex">
      <Clock className="h-4 w-4 text-ink-400" />
      <div className="leading-none">
        <p className="figure text-[13.5px] text-ink-800">{formatTimeSeconds(now)}</p>
        <p className="mt-0.5 text-[10.5px] text-ink-500">{formatDateFull(now)}</p>
      </div>
    </div>
  )
}

export function Topbar({
  title,
  subtitle,
  actions,
  onOpenMobile,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onOpenMobile: () => void
}) {
  const user = useAuthStore((s) => s.user)!
  const logout = useAuthStore((s) => s.logout)
  const db = useDataStore((s) => s.db)
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)

  const lowStock = db.inventory
    .map((i) => ({ inv: i, status: stockStatusOf(i.quantity, i.min_quantity) }))
    .filter((r) => r.status !== 'normal')

  const pendingAdjustments = db.stock_adjustments.filter((a) => a.status === 'pending')
  const notifCount = lowStock.length + pendingAdjustments.length

  const handleLogout = () => {
    logout()
    toast.info('Anda telah keluar')
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 bg-[var(--app-bg)]/85 px-4 backdrop-blur-xl lg:px-6">
        <button
          onClick={onOpenMobile}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[18px] font-bold leading-tight tracking-[-0.03em] text-ink-900">{title}</h1>
          {subtitle && <p className="truncate text-[12.5px] text-ink-500">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}

          <LiveClock />

          <button
            onClick={() => setNotifOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
            aria-label="Notifikasi"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notifCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[9px] font-bold text-white">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          <div className="hidden items-center gap-2.5 border-l border-ink-200 pl-3 sm:flex">
            <Avatar name={user.name} gradient={user.avatar_color} size="sm" />
            <div className="leading-none">
              <p className="text-[13px] font-bold text-ink-900">{user.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-500">{ROLE_META[user.role_id].label}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Keluar" className="sm:hidden">
            <LogOut className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </header>

      <Drawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Notifikasi"
        subtitle={`${notifCount} hal memerlukan perhatian`}
      >
        {notifCount === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success-50 text-success-600">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-800">Semua aman</p>
            <p className="mt-1 text-[13px] text-ink-500">Tidak ada peringatan stok maupun persetujuan tertunda.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {pendingAdjustments.length > 0 && (
              <section>
                <p className="section-title mb-2.5">Penyesuaian Menunggu</p>
                <div className="space-y-2">
                  {pendingAdjustments.slice(0, 5).map((a) => {
                    const product = db.products.find((p) => p.id === a.product_id)
                    return (
                      <div key={a.id} className="flex items-start gap-3 rounded-xl border border-ink-200 p-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning-50 text-warning-600">
                          <TriangleAlert className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-ink-800">{product?.name}</p>
                          <p className="mt-0.5 text-[12px] text-ink-500">
                            Selisih {a.difference > 0 ? '+' : ''}
                            {a.difference} · {a.reason}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {lowStock.length > 0 && (
              <section>
                <p className="section-title mb-2.5">Peringatan Stok</p>
                <div className="space-y-2">
                  {lowStock.slice(0, 8).map(({ inv, status }) => {
                    const product = db.products.find((p) => p.id === inv.product_id)
                    return (
                      <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-base">
                          <Glyph name={product?.emoji} className="h-4 w-4 text-ink-600" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-ink-800">{product?.name}</p>
                          <p className="mt-0.5 text-[12px] tnum text-ink-500">
                            Sisa {inv.quantity} {inv.unit} · min {inv.min_quantity}
                          </p>
                        </div>
                        <Badge tone={status === 'out' ? 'danger' : status === 'critical' ? 'amber' : 'warning'}>
                          {status === 'out' ? 'Habis' : status === 'critical' ? 'Kritis' : 'Rendah'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}

/** Ringkasan kecil untuk topbar POS. */
export function CartPill({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-900 px-3 py-2 text-white">
      <ShoppingCart className="h-4 w-4" />
      <span className="text-[13px] font-bold tnum">{count}</span>
      <span className="text-[13px] font-bold tnum">{formatIDR(total)}</span>
    </div>
  )
}
