import type { Order, SalesTarget, TargetStatus } from '@/types'
import { isRevenueOrder } from './analytics'
import { MONTHS } from './utils'

/**
 * ============================================================================
 *  KPI TARGET PENJUALAN
 *  Menghitung pencapaian terhadap target bulanan: progres, laju harian,
 *  proyeksi akhir bulan, dan berapa yang harus dikejar per hari tersisa.
 * ============================================================================
 */

/** 'YYYY-MM' untuk sebuah tanggal. */
export function periodKey(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 'September 2026' */
export function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return `${MONTHS[(month ?? 1) - 1]} ${year}`
}

/** 'Sep 26' — untuk sumbu chart. */
export function periodLabelShort(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return `${MONTHS[(month ?? 1) - 1].slice(0, 3)} ${String(year).slice(2)}`
}

export interface TargetProgress {
  period: string
  label: string
  /** Target bulan ini; 0 bila owner belum menetapkan target. */
  revenueTarget: number
  transactionTarget: number
  revenueActual: number
  transactionActual: number
  revenuePercent: number
  transactionPercent: number
  /** Jumlah hari dalam bulan & yang sudah berjalan. */
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  /** Target yang seharusnya sudah tercapai sampai hari ini (laju ideal). */
  expectedToDate: number
  /** Rata-rata omzet per hari berjalan. */
  dailyAverage: number
  /** Proyeksi omzet akhir bulan bila laju bertahan. */
  projection: number
  /** Sisa omzet yang harus dikejar. */
  remaining: number
  /** Omzet yang harus dicapai tiap hari tersisa. */
  requiredPerDay: number
  /** Target omzet harian ideal (target ÷ jumlah hari). */
  dailyTarget: number
  status: TargetStatus
  isCurrentMonth: boolean
  hasTarget: boolean
}

export const TARGET_STATUS_LABEL: Record<TargetStatus, string> = {
  upcoming: 'Belum Mulai',
  achieved: 'Target Tercapai',
  on_track: 'Sesuai Jalur',
  at_risk: 'Perlu Dikejar',
  behind: 'Tertinggal',
  missed: 'Tidak Tercapai',
}

export const TARGET_STATUS_TONE: Record<TargetStatus, 'success' | 'brand' | 'warning' | 'danger' | 'neutral'> = {
  upcoming: 'neutral',
  achieved: 'success',
  on_track: 'brand',
  at_risk: 'warning',
  behind: 'danger',
  missed: 'danger',
}

function statusOf(
  revenuePercent: number,
  pacePercent: number,
  isCurrentMonth: boolean,
  isFuture: boolean,
): TargetStatus {
  // Bulan yang belum berjalan tidak bisa dinilai tertinggal.
  if (isFuture) return 'upcoming'
  if (revenuePercent >= 100) return 'achieved'
  // Bulan lampau sudah selesai — hanya tercapai atau tidak.
  if (!isCurrentMonth) return 'missed'
  if (pacePercent >= 98) return 'on_track'
  if (pacePercent >= 85) return 'at_risk'
  return 'behind'
}

/** Hitung pencapaian satu periode terhadap targetnya. */
export function targetProgress(period: string, orders: Order[], targets: SalesTarget[]): TargetProgress {
  const target = targets.find((t) => t.period === period)
  const [year, month] = period.split('-').map(Number)

  const monthOrders = orders.filter((o) => isRevenueOrder(o) && periodKey(o.created_at) === period)
  const revenueActual = monthOrders.reduce((a, o) => a + o.total, 0)
  const transactionActual = monthOrders.length

  const daysInMonth = new Date(year, month, 0).getDate()
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  const isFuture = new Date(year, month - 1, 1).getTime() > now.getTime()

  const daysElapsed = isCurrentMonth ? now.getDate() : isFuture ? 0 : daysInMonth
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed)

  const revenueTarget = target?.revenue_target ?? 0
  const transactionTarget = target?.transaction_target ?? 0

  const dailyTarget = revenueTarget ? revenueTarget / daysInMonth : 0
  const expectedToDate = dailyTarget * daysElapsed
  const dailyAverage = daysElapsed ? revenueActual / daysElapsed : 0
  const projection = daysElapsed ? dailyAverage * daysInMonth : revenueActual
  const remaining = Math.max(0, revenueTarget - revenueActual)

  const revenuePercent = revenueTarget ? (revenueActual / revenueTarget) * 100 : 0
  const transactionPercent = transactionTarget ? (transactionActual / transactionTarget) * 100 : 0
  const pacePercent = expectedToDate ? (revenueActual / expectedToDate) * 100 : 100

  return {
    period,
    label: periodLabel(period),
    revenueTarget,
    transactionTarget,
    revenueActual,
    transactionActual,
    revenuePercent,
    transactionPercent,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    expectedToDate,
    dailyAverage,
    projection,
    remaining,
    requiredPerDay: daysRemaining ? remaining / daysRemaining : remaining,
    dailyTarget,
    status: statusOf(revenuePercent, pacePercent, isCurrentMonth, isFuture),
    isCurrentMonth,
    hasTarget: !!target && revenueTarget > 0,
  }
}

/** Pencapaian beberapa bulan terakhir, urut dari yang paling lama. */
export function targetHistory(orders: Order[], targets: SalesTarget[], months = 6): TargetProgress[] {
  const now = new Date()
  const rows: TargetProgress[] = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    rows.push(targetProgress(periodKey(d), orders, targets))
  }
  return rows
}

/** Progres target harian: bagian dari target bulanan yang jatuh pada hari ini. */
export interface DailyTargetProgress {
  target: number
  actual: number
  percent: number
  remaining: number
  transactionTarget: number
  transactionActual: number
  hasTarget: boolean
}

export function dailyTargetProgress(orders: Order[], targets: SalesTarget[]): DailyTargetProgress {
  const now = new Date()
  const progress = targetProgress(periodKey(now), orders, targets)

  const todayOrders = orders.filter((o) => {
    if (!isRevenueOrder(o)) return false
    const d = new Date(o.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  })

  const actual = todayOrders.reduce((a, o) => a + o.total, 0)
  const target = progress.dailyTarget
  const transactionTarget = progress.transactionTarget ? progress.transactionTarget / progress.daysInMonth : 0

  return {
    target,
    actual,
    percent: target ? (actual / target) * 100 : 0,
    remaining: Math.max(0, target - actual),
    transactionTarget,
    transactionActual: todayOrders.length,
    hasTarget: progress.hasTarget,
  }
}
