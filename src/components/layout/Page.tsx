import type { ReactNode } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE_OUT } from '@/components/ui/motion'
import { Topbar } from './Topbar'

interface ShellContext {
  openMobile: () => void
}

export function useShell(): ShellContext {
  return useOutletContext<ShellContext>() ?? { openMobile: () => {} }
}

/**
 * Kerangka halaman standar: topbar + area konten dengan padding konsisten.
 * `bleed` dipakai halaman POS yang mengelola scroll-nya sendiri.
 */
export function Page({
  title,
  subtitle,
  actions,
  children,
  bleed = false,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  bleed?: boolean
  className?: string
}) {
  const { openMobile } = useShell()
  const { pathname } = useLocation()

  return (
    <>
      <Topbar title={title} subtitle={subtitle} actions={actions} onOpenMobile={openMobile} />
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className={cn(
          bleed ? 'flex-1 lg:overflow-hidden' : 'flex-1 px-4 py-5 lg:px-6 lg:py-6',
          className,
        )}
      >
        {children}
      </motion.main>
    </>
  )
}

/** Judul seksi di dalam halaman. */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div>
        <h2 className="font-display text-[16px] font-bold tracking-[-0.02em] text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
