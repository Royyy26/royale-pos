import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springSoft } from './motion'
import { useToastStore, type ToastVariant } from '@/store/useToastStore'

const CONFIG: Record<ToastVariant, { icon: typeof CheckCircle2; ring: string; iconClass: string }> = {
  success: { icon: CheckCircle2, ring: 'ring-success-100', iconClass: 'text-success-600 bg-success-50' },
  error: { icon: XCircle, ring: 'ring-danger-100', iconClass: 'text-danger-600 bg-danger-50' },
  warning: { icon: AlertTriangle, ring: 'ring-warning-100', iconClass: 'text-warning-600 bg-warning-50' },
  info: { icon: Info, ring: 'ring-info-100', iconClass: 'text-info-600 bg-info-50' },
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2.5">
      <AnimatePresence initial={false}>
      {toasts.map((t) => {
        const { icon: Icon, ring, iconClass } = CONFIG[t.variant]
        return (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
            transition={springSoft}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-pop ring-1',
              ring,
            )}
          >
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', iconClass)}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-display text-[13.5px] font-bold leading-tight text-ink-900">{t.title}</p>
              {t.description && <p className="mt-1 text-[12.5px] leading-snug text-ink-500">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
              aria-label="Tutup notifikasi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )
      })}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
