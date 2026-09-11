import type {
  Category,
  Inventory,
  Order,
  Payment,
  PaymentMethodCode,
  Product,
  User,
} from '@/types'
import { addDays, endOfDay, endOfMonth, growth, startOfDay, startOfMonth, startOfWeek } from './utils'
import { stockStatusOf } from './labels'

/* ------------------------------ Rentang waktu ---------------------------- */

export type RangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_7'
  | 'last_30'
  | 'custom'

export interface DateRange {
  from: Date
  to: Date
  label: string
}

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: 'last_7', label: '7 Hari Terakhir' },
  { value: 'this_week', label: 'Minggu Ini' },
  { value: 'last_week', label: 'Minggu Lalu' },
  { value: 'last_30', label: '30 Hari Terakhir' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'last_month', label: 'Bulan Lalu' },
  { value: 'custom', label: 'Rentang Kustom' },
]

export function resolveRange(preset: RangePreset, customFrom?: string, customTo?: string): DateRange {
  const now = new Date()
  const label = RANGE_OPTIONS.find((r) => r.value === preset)?.label ?? 'Hari Ini'

  switch (preset) {
    case 'yesterday': {
      const d = addDays(now, -1)
      return { from: startOfDay(d), to: endOfDay(d), label }
    }
    case 'last_7':
      return { from: startOfDay(addDays(now, -6)), to: endOfDay(now), label }
    case 'this_week':
      return { from: startOfWeek(now), to: endOfDay(now), label }
    case 'last_week': {
      const from = addDays(startOfWeek(now), -7)
      return { from, to: endOfDay(addDays(from, 6)), label }
    }
    case 'last_30':
      return { from: startOfDay(addDays(now, -29)), to: endOfDay(now), label }
    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now), label }
    case 'last_month': {
      const from = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      return { from, to: endOfMonth(from), label }
    }
    case 'custom': {
      const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now)
      const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now)
      return { from, to, label }
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now), label }
  }
}

/** Rentang sebelumnya dengan panjang hari yang sama, untuk perbandingan periode. */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime()
  const to = new Date(range.from.getTime() - 1)
  const from = new Date(to.getTime() - span)
  return { from, to, label: 'Periode Sebelumnya' }
}

export function inRange(dateStr: string, range: DateRange): boolean {
  const t = new Date(dateStr).getTime()
  return t >= range.from.getTime() && t <= range.to.getTime()
}

export function filterOrders(orders: Order[], range: DateRange): Order[] {
  return orders.filter((o) => inRange(o.created_at, range))
}

/* -------------------------------- Ringkasan ------------------------------ */

export interface SalesSummary {
  revenue: number
  grossSales: number
  transactions: number
  itemsSold: number
  averageOrderValue: number
  discountTotal: number
  taxTotal: number
  serviceTotal: number
  refundTotal: number
  refundCount: number
  voidTotal: number
  voidCount: number
  estimatedCost: number
  estimatedProfit: number
  marginPercent: number
}

/** Order yang dihitung sebagai pendapatan (selesai / dibayar). */
export function isRevenueOrder(o: Order): boolean {
  return o.status === 'completed' || o.status === 'paid' || o.status === 'confirmed'
}

export function summarize(orders: Order[]): SalesSummary {
  const revenueOrders = orders.filter(isRevenueOrder)
  const refunded = orders.filter((o) => o.status === 'refunded')
  const cancelled = orders.filter((o) => o.status === 'cancelled')

  const revenue = revenueOrders.reduce((a, o) => a + o.total, 0)
  const grossSales = revenueOrders.reduce((a, o) => a + o.subtotal, 0)
  const itemsSold = revenueOrders.reduce((a, o) => a + o.items.reduce((s, i) => s + i.quantity, 0), 0)
  const estimatedCost = revenueOrders.reduce(
    (a, o) => a + o.items.reduce((s, i) => s + i.cost_price * i.quantity, 0),
    0,
  )
  const grossProfit = grossSales - estimatedCost - revenueOrders.reduce((a, o) => a + o.discount_amount, 0)

  return {
    revenue,
    grossSales,
    transactions: revenueOrders.length,
    itemsSold,
    averageOrderValue: revenueOrders.length ? revenue / revenueOrders.length : 0,
    discountTotal: revenueOrders.reduce((a, o) => a + o.discount_amount, 0),
    taxTotal: revenueOrders.reduce((a, o) => a + o.tax_amount, 0),
    serviceTotal: revenueOrders.reduce((a, o) => a + o.service_amount, 0),
    refundTotal: refunded.reduce((a, o) => a + o.total, 0),
    refundCount: refunded.length,
    voidTotal: cancelled.reduce((a, o) => a + o.total, 0),
    voidCount: cancelled.length,
    estimatedCost,
    estimatedProfit: grossProfit,
    marginPercent: grossSales ? (grossProfit / grossSales) * 100 : 0,
  }
}

export function compareSummary(current: SalesSummary, previous: SalesSummary) {
  return {
    revenue: growth(current.revenue, previous.revenue),
    transactions: growth(current.transactions, previous.transactions),
    averageOrderValue: growth(current.averageOrderValue, previous.averageOrderValue),
    itemsSold: growth(current.itemsSold, previous.itemsSold),
    profit: growth(current.estimatedProfit, previous.estimatedProfit),
  }
}

/* ---------------------------- Metode pembayaran -------------------------- */

export interface PaymentBreakdownRow {
  method: PaymentMethodCode
  amount: number
  count: number
  percent: number
}

export function paymentBreakdown(orders: Order[], payments: Payment[]): PaymentBreakdownRow[] {
  const validIds = new Set(orders.filter(isRevenueOrder).map((o) => o.id))
  const relevant = payments.filter((p) => validIds.has(p.order_id) && p.status === 'success')
  const total = relevant.reduce((a, p) => a + p.amount, 0)

  const methods: PaymentMethodCode[] = ['cash', 'qris', 'transfer', 'card']
  return methods.map((method) => {
    const rows = relevant.filter((p) => p.method === method)
    const amount = rows.reduce((a, p) => a + p.amount, 0)
    return { method, amount, count: rows.length, percent: total ? (amount / total) * 100 : 0 }
  })
}

/* ------------------------------- Time series ----------------------------- */

export interface SeriesPoint {
  key: string
  label: string
  revenue: number
  transactions: number
  items: number
}

export function hourlySeries(orders: Order[]): SeriesPoint[] {
  const buckets = new Map<number, SeriesPoint>()
  for (let h = 7; h <= 22; h += 1) {
    buckets.set(h, { key: String(h), label: `${String(h).padStart(2, '0')}:00`, revenue: 0, transactions: 0, items: 0 })
  }
  for (const o of orders.filter(isRevenueOrder)) {
    const h = new Date(o.created_at).getHours()
    const bucket = buckets.get(h)
    if (!bucket) continue
    bucket.revenue += o.total
    bucket.transactions += 1
    bucket.items += o.items.reduce((a, i) => a + i.quantity, 0)
  }
  return Array.from(buckets.values())
}

export function dailySeries(orders: Order[], range: DateRange): SeriesPoint[] {
  const points: SeriesPoint[] = []
  const cursor = startOfDay(range.from)
  const last = startOfDay(range.to)
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  while (cursor.getTime() <= last.getTime()) {
    const key = cursor.toDateString()
    points.push({
      key,
      label: `${cursor.getDate()} ${MONTHS_SHORT[cursor.getMonth()]}`,
      revenue: 0,
      transactions: 0,
      items: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  const index = new Map(points.map((p) => [p.key, p]))
  for (const o of orders.filter(isRevenueOrder)) {
    const point = index.get(startOfDay(o.created_at).toDateString())
    if (!point) continue
    point.revenue += o.total
    point.transactions += 1
    point.items += o.items.reduce((a, i) => a + i.quantity, 0)
  }
  return points
}

export function weeklySeries(orders: Order[], weeks = 8): SeriesPoint[] {
  const points: SeriesPoint[] = []
  const now = new Date()
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(startOfWeek(now), -i * 7)
    points.push({
      key: start.toDateString(),
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      revenue: 0,
      transactions: 0,
      items: 0,
    })
  }
  const index = new Map(points.map((p) => [p.key, p]))
  for (const o of orders.filter(isRevenueOrder)) {
    const key = startOfWeek(o.created_at).toDateString()
    const point = index.get(key)
    if (!point) continue
    point.revenue += o.total
    point.transactions += 1
    point.items += o.items.reduce((a, i) => a + i.quantity, 0)
  }
  return points
}

export function monthlySeries(orders: Order[], months = 6): SeriesPoint[] {
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const points: SeriesPoint[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    points.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      revenue: 0,
      transactions: 0,
      items: 0,
    })
  }
  const index = new Map(points.map((p) => [p.key, p]))
  for (const o of orders.filter(isRevenueOrder)) {
    const d = new Date(o.created_at)
    const point = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (!point) continue
    point.revenue += o.total
    point.transactions += 1
    point.items += o.items.reduce((a, i) => a + i.quantity, 0)
  }
  return points
}

/* ------------------------------ Produk & kategori ------------------------ */

export interface ProductPerformance {
  product_id: string
  name: string
  emoji: string
  category_id: string
  quantity: number
  revenue: number
  cost: number
  profit: number
  orders: number
}

export function productPerformance(orders: Order[], products: Product[]): ProductPerformance[] {
  const map = new Map<string, ProductPerformance>()
  for (const p of products) {
    map.set(p.id, {
      product_id: p.id,
      name: p.name,
      emoji: p.emoji,
      category_id: p.category_id,
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      orders: 0,
    })
  }
  for (const o of orders.filter(isRevenueOrder)) {
    const seen = new Set<string>()
    for (const item of o.items) {
      const row = map.get(item.product_id)
      if (!row) continue
      row.quantity += item.quantity
      row.revenue += item.subtotal
      row.cost += item.cost_price * item.quantity
      if (!seen.has(item.product_id)) {
        row.orders += 1
        seen.add(item.product_id)
      }
    }
  }
  for (const row of map.values()) row.profit = row.revenue - row.cost
  return Array.from(map.values())
}

export interface CategoryPerformance {
  category_id: string
  name: string
  icon: string
  quantity: number
  revenue: number
  percent: number
}

export function categoryPerformance(
  orders: Order[],
  products: Product[],
  categories: Category[],
): CategoryPerformance[] {
  const perf = productPerformance(orders, products)
  const total = perf.reduce((a, p) => a + p.revenue, 0)
  return categories
    .map((c) => {
      const rows = perf.filter((p) => p.category_id === c.id)
      const revenue = rows.reduce((a, p) => a + p.revenue, 0)
      return {
        category_id: c.id,
        name: c.name,
        icon: c.icon,
        quantity: rows.reduce((a, p) => a + p.quantity, 0),
        revenue,
        percent: total ? (revenue / total) * 100 : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

/* -------------------------------- Kasir ---------------------------------- */

export interface CashierPerformance {
  user_id: string
  name: string
  avatar_color: string
  transactions: number
  revenue: number
  averageOrderValue: number
  refunds: number
  voids: number
}

export function cashierPerformance(orders: Order[], users: User[]): CashierPerformance[] {
  return users
    .filter((u) => u.role_id === 'kasir' || u.role_id === 'owner')
    .map((u) => {
      const own = orders.filter((o) => o.cashier_id === u.id)
      const revenueOrders = own.filter(isRevenueOrder)
      const revenue = revenueOrders.reduce((a, o) => a + o.total, 0)
      return {
        user_id: u.id,
        name: u.name,
        avatar_color: u.avatar_color,
        transactions: revenueOrders.length,
        revenue,
        averageOrderValue: revenueOrders.length ? revenue / revenueOrders.length : 0,
        refunds: own.filter((o) => o.status === 'refunded').length,
        voids: own.filter((o) => o.status === 'cancelled').length,
      }
    })
    .filter((c) => c.transactions > 0 || c.refunds > 0 || c.voids > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

/* ------------------------------- Inventori ------------------------------- */

export interface StockOverview {
  totalItems: number
  totalUnits: number
  stockValue: number
  retailValue: number
  lowStock: number
  criticalStock: number
  outOfStock: number
  normal: number
}

export function stockOverview(inventory: Inventory[], products: Product[]): StockOverview {
  const productMap = new Map(products.map((p) => [p.id, p]))
  let stockValue = 0
  let retailValue = 0
  let low = 0
  let critical = 0
  let out = 0
  let normal = 0
  let totalUnits = 0

  for (const inv of inventory) {
    const product = productMap.get(inv.product_id)
    if (!product) continue
    totalUnits += inv.quantity
    stockValue += inv.quantity * product.cost_price
    retailValue += inv.quantity * product.price
    const status = stockStatusOf(inv.quantity, inv.min_quantity)
    if (status === 'out') out += 1
    else if (status === 'critical') critical += 1
    else if (status === 'low') low += 1
    else normal += 1
  }

  return {
    totalItems: inventory.length,
    totalUnits,
    stockValue,
    retailValue,
    lowStock: low,
    criticalStock: critical,
    outOfStock: out,
    normal,
  }
}

export interface MovementClass {
  product_id: string
  name: string
  emoji: string
  quantity: number
  stock: number
  daysOfStock: number
}

/** Klasifikasi fast/slow moving berdasarkan penjualan periode terpilih. */
export function movementClassification(
  orders: Order[],
  products: Product[],
  inventory: Inventory[],
  days: number,
): { fast: MovementClass[]; slow: MovementClass[] } {
  const perf = productPerformance(orders, products)
  const invMap = new Map(inventory.map((i) => [i.product_id, i]))

  const rows: MovementClass[] = perf.map((p) => {
    const stock = invMap.get(p.product_id)?.quantity ?? 0
    const perDay = p.quantity / Math.max(1, days)
    return {
      product_id: p.product_id,
      name: p.name,
      emoji: p.emoji,
      quantity: p.quantity,
      stock,
      daysOfStock: perDay > 0 ? stock / perDay : 999,
    }
  })

  const sorted = [...rows].sort((a, b) => b.quantity - a.quantity)
  return { fast: sorted.slice(0, 6), slow: sorted.filter((r) => r.quantity >= 0).slice(-6).reverse() }
}

/* ---------------------------- Rekap harian ------------------------------- */

export interface DailyRecapRow {
  key: string
  date: Date
  orders: Order[]
  transactions: number
  itemsSold: number
  grossSales: number
  discountTotal: number
  taxTotal: number
  serviceTotal: number
  revenue: number
  averageOrderValue: number
  refundCount: number
  refundTotal: number
  voidCount: number
  voidTotal: number
  estimatedProfit: number
  byMethod: Record<PaymentMethodCode, { amount: number; count: number }>
}

const EMPTY_METHODS = (): Record<PaymentMethodCode, { amount: number; count: number }> => ({
  cash: { amount: 0, count: 0 },
  qris: { amount: 0, count: 0 },
  transfer: { amount: 0, count: 0 },
  card: { amount: 0, count: 0 },
})

/**
 * Rekap penjualan per hari, pengganti penutupan shift. Setiap baris berisi
 * total penjualan harian beserta rincian per metode pembayaran.
 */
export function dailyRecap(orders: Order[], payments: Payment[]): DailyRecapRow[] {
  const paymentByOrder = new Map(payments.map((p) => [p.order_id, p]))
  const buckets = new Map<string, Order[]>()

  for (const o of orders) {
    const key = startOfDay(o.created_at).toDateString()
    const list = buckets.get(key)
    if (list) list.push(o)
    else buckets.set(key, [o])
  }

  const rows: DailyRecapRow[] = []

  for (const [key, list] of buckets) {
    const summary = summarize(list)
    const byMethod = EMPTY_METHODS()

    for (const o of list) {
      if (!isRevenueOrder(o)) continue
      const payment = paymentByOrder.get(o.id)
      if (!payment || payment.status !== 'success') continue
      byMethod[payment.method].amount += payment.amount
      byMethod[payment.method].count += 1
    }

    rows.push({
      key,
      date: new Date(key),
      orders: [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      transactions: summary.transactions,
      itemsSold: summary.itemsSold,
      grossSales: summary.grossSales,
      discountTotal: summary.discountTotal,
      taxTotal: summary.taxTotal,
      serviceTotal: summary.serviceTotal,
      revenue: summary.revenue,
      averageOrderValue: summary.averageOrderValue,
      refundCount: summary.refundCount,
      refundTotal: summary.refundTotal,
      voidCount: summary.voidCount,
      voidTotal: summary.voidTotal,
      estimatedProfit: summary.estimatedProfit,
      byMethod,
    })
  }

  return rows.sort((a, b) => b.date.getTime() - a.date.getTime())
}
