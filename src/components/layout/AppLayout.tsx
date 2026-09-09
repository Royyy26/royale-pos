import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'

const COLLAPSE_KEY = 'royale-sidebar-collapsed'

export interface PageMeta {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* abaikan */
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div id="app-shell" className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          // Sisakan ruang hanya ketika sidebar benar-benar menetap di layar.
          'flex min-h-screen flex-col transition-[padding] duration-300',
          collapsed ? 'md:pl-[78px]' : 'md:pl-[264px]',
        )}
      >
        <Outlet context={{ openMobile: () => setMobileOpen(true) }} />
      </div>
    </div>
  )
}
