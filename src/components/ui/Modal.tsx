import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, HelpCircle, OctagonAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE_OUT, springSoft } from './motion'
import { Button } from './Button'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[95vw]',
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  hideClose = false,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
  closeOnBackdrop?: boolean
  hideClose?: boolean
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
    <div className="no-print fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[3px]"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
        transition={springSoft}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-pop',
          SIZES[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-ink-150 px-6 py-5">
            <div className="min-w-0">
              {title && <h2 className="font-display text-[19px] font-bold leading-tight tracking-[-0.03em] text-ink-900">{title}</h2>}
              {subtitle && <p className="mt-1 text-[13px] leading-snug text-ink-500">{subtitle}</p>}
            </div>
            {!hideClose && (
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <div className="scroll-area flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-ink-100 bg-ink-50 px-6 py-4">{footer}</div>}
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------------------------- Confirm dialog ----------------------------- */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'danger',
  loading,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary' | 'warning'
  loading?: boolean
  children?: ReactNode
}) {
  const Icon = tone === 'danger' ? OctagonAlert : tone === 'warning' ? AlertTriangle : HelpCircle
  const iconStyle =
    tone === 'danger'
      ? 'bg-danger-50 text-danger-600'
      : tone === 'warning'
        ? 'bg-warning-50 text-warning-600'
        : 'bg-info-50 text-info-600'

  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="text-center">
        <div className={cn('mx-auto grid h-14 w-14 place-items-center rounded-2xl', iconStyle)}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-[19px] font-bold tracking-[-0.02em] text-ink-900">{title}</h2>
        {description && <div className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{description}</div>}
      </div>
      {children && <div className="mt-5 text-left">{children}</div>}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" fullWidth size="lg" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          fullWidth
          size="lg"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* --------------------------------- Drawer -------------------------------- */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
    <div className="no-print fixed inset-0 z-[100]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%', transition: { duration: 0.2, ease: EASE_OUT } }}
        transition={springSoft}
        className={cn('absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-pop', width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            {title && <h2 className="font-display text-[19px] font-bold tracking-[-0.03em] text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="scroll-area flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-ink-100 bg-ink-50 px-6 py-4">{footer}</div>}
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
