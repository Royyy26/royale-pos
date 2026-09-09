import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ------------------------------- Uang (IDR) ------------------------------ */

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const plain = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** Rp 1.250.000 */
export function formatIDR(value: number): string {
  return idr.format(Math.round(value || 0)).replace(/\s/g, ' ')
}

/** 1.250.000 (tanpa prefix) */
export function formatNumber(value: number): string {
  return plain.format(Math.round(value || 0))
}

/** Rp 1,2 jt — untuk KPI card & sumbu chart. */
export function formatCompactIDR(value: number): string {
  const v = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (v >= 1_000_000_000) return `${sign}Rp ${(v / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (v >= 1_000_000) return `${sign}Rp ${(v / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (v >= 1_000) return `${sign}Rp ${Math.round(v / 1_000)} rb`
  return `${sign}Rp ${plain.format(v)}`
}

/** Ubah string input berformat ("150.000") menjadi number. */
export function parseIDRInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')}%`
}

/* --------------------------------- Waktu --------------------------------- */

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/** 08 September 2026 */
export function formatDate(value: string | Date): string {
  const d = toDate(value)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** 08 Sep 2026 */
export function formatDateShort(value: string | Date): string {
  const d = toDate(value)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** Senin, 08 September 2026 */
export function formatDateFull(value: string | Date): string {
  const d = toDate(value)
  return `${DAYS[d.getDay()]}, ${formatDate(d)}`
}

/** 14:35 */
export function formatTime(value: string | Date): string {
  const d = toDate(value)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 14:35:07 */
export function formatTimeSeconds(value: string | Date): string {
  return `${formatTime(value)}:${String(toDate(value).getSeconds()).padStart(2, '0')}`
}

/** 08 Sep 2026 · 14:35 */
export function formatDateTime(value: string | Date): string {
  return `${formatDateShort(value)} · ${formatTime(value)}`
}

/** "3 menit lalu" */
export function formatRelative(value: string | Date): string {
  const diff = Date.now() - toDate(value).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min} menit lalu`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} jam lalu`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} hari lalu`
  return formatDateShort(value)
}

/** Durasi antara dua waktu -> "7j 21m" */
export function formatDuration(from: string | Date, to: string | Date = new Date()): string {
  const ms = Math.max(0, toDate(to).getTime() - toDate(from).getTime())
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}j ${m}m` : `${m}m`
}

export function startOfDay(value: string | Date): Date {
  const d = toDate(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export function endOfDay(value: string | Date): Date {
  const d = toDate(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function addDays(value: string | Date, days: number): Date {
  const d = toDate(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds())
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  const x = toDate(a)
  const y = toDate(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

/** Senin sebagai awal minggu. */
export function startOfWeek(value: string | Date): Date {
  const d = startOfDay(value)
  const day = (d.getDay() + 6) % 7
  return addDays(d, -day)
}

export function startOfMonth(value: string | Date): Date {
  const d = toDate(value)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(value: string | Date): Date {
  const d = toDate(value)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** YYYY-MM-DD untuk <input type="date"> */
export function toInputDate(value: string | Date): string {
  const d = toDate(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export { MONTHS_SHORT, MONTHS, DAYS }

/* --------------------------------- Umum ---------------------------------- */

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0)
}

export function groupBy<T>(items: T[], selector: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = selector(item)
    ;(acc[key] ||= []).push(item)
    return acc
  }, {})
}

/** Persentase pertumbuhan aman terhadap pembagi nol. */
export function growth(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Pembulatan ke kelipatan terdekat (untuk saran nominal uang tunai). */
export function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

/** Saran nominal pembayaran tunai yang lazim dipakai kasir. */
export function cashSuggestions(total: number): number[] {
  const set = new Set<number>()
  set.add(total)
  for (const step of [1000, 5000, 10000, 50000, 100000]) {
    const v = roundUpTo(total, step)
    if (v >= total) set.add(v)
  }
  for (const bill of [20000, 50000, 100000, 150000, 200000, 500000]) {
    if (bill >= total) set.add(bill)
  }
  return Array.from(set)
    .sort((a, b) => a - b)
    .slice(0, 6)
}
