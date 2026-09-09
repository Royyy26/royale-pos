import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, LogOut, PanelLeftOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsDesktopSidebar } from '@/lib/useMediaQuery'
import { NAVIGATION } from '@/app/navigation'
import { ROLE_META } from '@/lib/rbac'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { stockStatusOf } from '@/lib/labels'
import { Avatar } from '@/components/ui/primitives'
import { springSoft } from '@/components/ui/motion'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const has = useAuthStore((s) => s.has)
  const logout = useAuthStore((s) => s.logout)
  const db = useDataStore((s) => s.db)
  const navigate = useNavigate()
  const isDesktop = useIsDesktopSidebar()

  /**
   * Mode rail sempit hanya berlaku pada sidebar menetap. Di layar sempit
   * sidebar tampil sebagai panel melayang — kalau ikut menciut, labelnya
   * hilang dan tombol pelebarnya pun tak tersedia, sehingga pengguna terjebak.
   */
  const isRail = collapsed && isDesktop

  if (!user) return null

  const groups = NAVIGATION[user.role_id] ?? []

  const badges = {
    openBills: db.orders.filter((o) => o.status === 'pending').length,
    pendingAdjustments: db.stock_adjustments.filter((a) => a.status === 'pending').length,
    lowStock: db.inventory.filter((i) => {
      const s = stockStatusOf(i.quantity, i.min_quantity)
      return s === 'low' || s === 'critical' || s === 'out'
    }).length,
  }

  const handleLogout = () => {
    logout()
    toast.info('Anda telah keluar', 'Sampai jumpa kembali.')
    navigate('/login', { replace: true })
  }

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="no-print fixed inset-0 z-40 bg-ink-950/50 md:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'no-print surface-dark fixed inset-y-0 left-0 z-50 flex flex-col text-ink-50',
          'transition-[width,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)]',
          isRail ? 'w-[78px]' : 'w-[264px]',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Garis saffron tipis di tepi kanan — penanda merek yang halus. */}
        <span className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand-500/40 to-transparent" />

        {/* Brand */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-white/[0.07]',
            isRail ? 'justify-center px-0' : 'gap-3 px-4',
          )}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-[0_6px_18px_-6px_rgba(224,146,26,.7)]">
            <Glyph name={db.settings.logo_emoji} className="h-5 w-5" />
          </div>
          {!isRail && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[14.5px] font-bold leading-tight tracking-[-0.02em]">
                  {db.settings.business_name}
                </p>
                <p className="truncate text-[11px] text-ink-50/40">{db.settings.tagline}</p>
              </div>
              {/* Di layar sempit tombol ini menutup panel; di desktop ia menciutkannya. */}
              <button
                onClick={isDesktop ? onToggle : onCloseMobile}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-50/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={isDesktop ? 'Ciutkan sidebar' : 'Tutup menu'}
                title={isDesktop ? 'Ciutkan sidebar' : 'Tutup menu'}
              >
                {isDesktop ? <ChevronLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>

        {/*
          Pada mode rail, tombol pelebar mendapat barisnya sendiri. Sebelumnya ia
          diletakkan sebaris dengan logo dan terdorong keluar dari lebar 78px —
          membuat sidebar mustahil dilebarkan kembali.
        */}
        {isRail && (
          <button
            onClick={onToggle}
            className="mx-3 mt-3 grid h-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-ink-50/60 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Lebarkan sidebar"
            title="Lebarkan sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Menu */}
        <nav className="scroll-area flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            const visible = group.items.filter((item) => !item.permission || has(item.permission))
            if (!visible.length) return null
            return (
              <div key={group.label} className="mb-5">
                {!isRail && (
                  <p className="mb-2 px-3 text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-50/30">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visible.map((item) => {
                    const Icon = item.icon
                    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={onCloseMobile}
                          title={isRail ? item.label : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150',
                              isActive ? 'text-ink-950' : 'text-ink-50/55 hover:bg-white/[0.06] hover:text-white',
                              isRail && 'justify-center px-0',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {/* Pil aktif yang berpindah mulus antar menu. */}
                              {isActive && (
                                <motion.span
                                  layoutId="nav-active-pill"
                                  transition={springSoft}
                                  className="absolute inset-0 -z-10 rounded-xl bg-brand-500 shadow-[0_8px_20px_-8px_rgba(224,146,26,.75)]"
                                />
                              )}
                              <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-ink-950')} />
                              {!isRail && (
                                <span className={cn('flex-1 truncate', isActive && 'font-bold')}>{item.label}</span>
                              )}
                              {!isRail && badgeCount > 0 && (
                                <span
                                  className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                    isActive ? 'bg-ink-950/15 text-ink-950' : 'bg-brand-500/20 text-brand-200',
                                  )}
                                >
                                  {badgeCount}
                                </span>
                              )}
                              {isRail && badgeCount > 0 && (
                                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-400" />
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Profil */}
        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-white/[0.05] p-2.5 ring-1 ring-inset ring-white/[0.06]',
              isRail && 'justify-center',
            )}
          >
            <Avatar name={user.name} gradient={user.avatar_color} size="sm" />
            {!isRail && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight">{user.name}</p>
                <p className="truncate text-[11px] text-ink-50/40">{ROLE_META[user.role_id].label}</p>
              </div>
            )}
            {!isRail && (
              <button
                onClick={handleLogout}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-50/45 transition-colors hover:bg-danger-500/20 hover:text-danger-200"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          {isRail && (
            <button
              onClick={handleLogout}
              className="mt-2 grid h-9 w-full place-items-center rounded-xl text-ink-50/45 transition-colors hover:bg-danger-500/20 hover:text-danger-200"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
