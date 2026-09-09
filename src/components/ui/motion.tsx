import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
  type Transition,
} from 'framer-motion'
import { cn, formatIDR, formatNumber } from '@/lib/utils'

/**
 * ============================================================================
 *  PRIMITIF MOTION
 *  Gerakan dijaga singkat (150–320 ms) agar tidak pernah menghambat kasir.
 *  Seluruhnya menghormati `prefers-reduced-motion`.
 * ============================================================================
 */

export const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1]

export const springSoft: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }
export const springSnappy: Transition = { type: 'spring', stiffness: 620, damping: 30, mass: 0.5 }

/* ------------------------------- Fade & rise ----------------------------- */

export function FadeIn({
  children,
  delay = 0,
  y = 10,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: EASE_OUT }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Bungkus daftar agar anak-anaknya muncul bertahap. */
export function Stagger({
  children,
  className,
  gap = 0.045,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  gap?: number
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : 'hidden'}
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  )
}

/** Anak dari <Stagger>. */
export function StaggerItem({
  children,
  className,
  y = 12,
  ...rest
}: { children: ReactNode; className?: string; y?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/* --------------------------- Angka beranimasi ---------------------------- */

/**
 * Angka yang merayap naik menuju nilai barunya. Dipakai untuk nominal utama
 * agar perubahan terasa, bukan sekadar berganti diam-diam.
 */
export function AnimatedNumber({
  value,
  format = 'idr',
  className,
  duration = 0.9,
}: {
  value: number
  format?: 'idr' | 'plain'
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(reduce ? value : 0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    if (!inView) return

    const from = startedRef.current ? display : 0
    startedRef.current = true

    if (from === value) return
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      // easeOutExpo — cepat di awal, mendarat halus.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce])

  return (
    <span ref={ref} className={className}>
      {format === 'idr' ? formatIDR(display) : formatNumber(display)}
    </span>
  )
}

/* ------------------------------- Pressable ------------------------------- */

/** Kartu/tombol besar dengan pegas saat ditekan — terasa "berbobot". */
export function Pressable({
  children,
  className,
  disabled,
  onClick,
  scale = 0.975,
  ...rest
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  scale?: number
} & Omit<HTMLMotionProps<'button'>, 'onClick'>) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
      whileTap={reduce || disabled ? undefined : { scale }}
      whileHover={reduce || disabled ? undefined : { y: -2 }}
      transition={springSnappy}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

/* ------------------------------ Progress bar ----------------------------- */

/** Bar progres yang tumbuh dari nol saat pertama tampil. */
export function AnimatedBar({
  value,
  tone = 'brand',
  className,
  height = 'h-2',
}: {
  value: number
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'ink'
  className?: string
  height?: string
}) {
  const reduce = useReducedMotion()
  const colors = {
    brand: 'bg-brand-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    ink: 'bg-ink-800',
  }
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink-150', height, className)}>
      <motion.div
        className={cn('h-full rounded-full', colors[tone])}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.85, ease: EASE_OUT }}
      />
    </div>
  )
}

/* ------------------------------ Nilai halus ------------------------------ */

/** Motion value yang mengikuti angka dengan pegas — untuk indikator langsung. */
export function useSpringValue(target: number) {
  const value = useMotionValue(target)
  const spring = useSpring(value, { stiffness: 240, damping: 30 })
  useEffect(() => {
    value.set(target)
  }, [target, value])
  return spring
}

export { motion }
