import {
  CATEGORIES,
  DEFAULT_MONTHLY_REVENUE_TARGET,
  DEFAULT_MONTHLY_TRANSACTION_TARGET,
  DEFAULT_SETTINGS,
  PRODUCTS,
  TABLES,
  USERS,
} from './catalog'
import type {
  AuditLog,
  Inventory,
  Invoice,
  Order,
  OrderItem,
  OrderType,
  Payment,
  PaymentMethodCode,
  Product,
  RestaurantTable,
  SalesTarget,
  StockAdjustment,
  StockMovement,
} from '@/types'

/* -------------------------- PRNG deterministik --------------------------- */
/** Mulberry32, data dummy selalu sama di setiap perangkat demo. */
function createRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = createRandom(20260908)

const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const chance = (p: number) => rand() < p

const iso = (d: Date) => d.toISOString()

/* ------------------------------- Konstanta ------------------------------- */

/**
 * Jumlah hari riwayat transaksi yang dibangkitkan. Dibatasi agar seluruh
 * basis data demo tetap muat pada kuota localStorage peramban.
 */
export const HISTORY_DAYS = 60

/** Jam operasional gerai. */
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 22

const CASHIER = USERS.find((u) => u.role_id === 'kasir')!
const OWNER = USERS.find((u) => u.role_id === 'owner')!

const CUSTOMER_NAMES = [
  'Andi', 'Bunga', 'Citra', 'Dimas', 'Eka', 'Farhan', 'Gita', 'Hendra',
  'Intan', 'Joko', 'Kiara', 'Lukman', 'Maya', 'Nadia', 'Oscar', 'Putri',
  'Rangga', 'Sinta', 'Tommy', 'Vina', 'Wawan', 'Yuni', 'Zaki', 'Bayu',
]

const ORDER_NOTES = [
  '', '', '', '', '',
  'Tidak pedas',
  'Es sedikit',
  'Pisah saus',
  'Bungkus rapi, untuk dibawa jauh',
  'Tanpa bawang',
  'Sajikan bersamaan',
]

const ITEM_NOTES = ['', '', '', '', '', '', 'Less sugar', 'Extra pedas', 'Tanpa es', 'Hot', 'Well done']

const CANCEL_REASONS = [
  'Pelanggan membatalkan pesanan',
  'Salah input menu',
  'Stok bahan habis',
  'Menu tidak tersedia',
]

const REFUND_REASONS = [
  'Pesanan tidak sesuai',
  'Kualitas produk tidak memuaskan',
  'Pelanggan komplain waktu tunggu',
]

/** Bobot popularitas, produk index awal lebih laris (best seller). */
function weightedProduct(): Product {
  const active = PRODUCTS
  const r = rand()
  // 55% dari 12 produk teratas, 30% menengah, 15% sisanya
  if (r < 0.55) return active[between(0, 11)]
  if (r < 0.85) return active[between(12, 29)]
  return active[between(30, active.length - 1)]
}

/** Faktor musiman: akhir pekan lebih ramai, ada tren pertumbuhan ringan. */
function dayFactor(date: Date, dayIndexFromStart: number): number {
  const dow = date.getDay()
  const weekend = dow === 5 || dow === 6 ? 1.42 : dow === 0 ? 1.25 : 1
  const trend = 1 + dayIndexFromStart * 0.0035
  const noise = 0.85 + rand() * 0.3
  return weekend * trend * noise
}

/** Distribusi jam operasional 08:00–22:00 dengan puncak makan siang & malam. */
const HOUR_WEIGHTS: [number, number][] = [
  [8, 3], [9, 4], [10, 5], [11, 8], [12, 14], [13, 12], [14, 7],
  [15, 6], [16, 7], [17, 8], [18, 12], [19, 14], [20, 11], [21, 6],
]
const HOUR_TOTAL = HOUR_WEIGHTS.reduce((a, [, w]) => a + w, 0)

function pickHour(): number {
  let r = rand() * HOUR_TOTAL
  for (const [hour, weight] of HOUR_WEIGHTS) {
    r -= weight
    if (r <= 0) return hour
  }
  return 12
}

const PAYMENT_WEIGHTS: [PaymentMethodCode, number][] = [
  ['qris', 42], ['cash', 31], ['card', 16], ['transfer', 11],
]
const PAYMENT_TOTAL = PAYMENT_WEIGHTS.reduce((a, [, w]) => a + w, 0)

function pickPayment(): PaymentMethodCode {
  let r = rand() * PAYMENT_TOTAL
  for (const [code, weight] of PAYMENT_WEIGHTS) {
    r -= weight
    if (r <= 0) return code
  }
  return 'cash'
}

const ORDER_TYPE_WEIGHTS: [OrderType, number][] = [['dine_in', 58], ['take_away', 30], ['delivery', 12]]

function pickOrderType(): OrderType {
  let r = rand() * 100
  for (const [type, weight] of ORDER_TYPE_WEIGHTS) {
    r -= weight
    if (r <= 0) return type
  }
  return 'dine_in'
}

/* --------------------------- Bangun satu order --------------------------- */

interface BuiltOrder {
  order: Order
  payment: Payment | null
  invoice: Invoice | null
}

function buildOrder(date: Date, sequence: number): BuiltOrder {
  const orderId = `ord_${date.getTime()}_${sequence}`
  const itemCount = between(1, 5)
  const chosen = new Map<string, OrderItem>()

  for (let i = 0; i < itemCount; i += 1) {
    const product = weightedProduct()
    const existing = chosen.get(product.id)
    if (existing) {
      existing.quantity += 1
      existing.subtotal = existing.quantity * existing.price
      continue
    }
    const quantity = chance(0.22) ? between(2, 3) : 1
    chosen.set(product.id, {
      id: `oi_${orderId}_${i}`,
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      emoji: product.emoji,
      price: product.price,
      cost_price: product.cost_price,
      quantity,
      discount: 0,
      note: pick(ITEM_NOTES),
      subtotal: product.price * quantity,
    })
  }

  const items = Array.from(chosen.values())
  const subtotal = items.reduce((a, it) => a + it.subtotal, 0)

  // Diskon hanya boleh diberikan owner, jadi porsinya kecil pada data historis.
  const hasDiscount = chance(0.09)
  const discountAmount = hasDiscount ? Math.round((subtotal * pick([5, 10, 15])) / 100 / 500) * 500 : 0
  const discountNote = hasDiscount ? pick(['Promo member', 'Voucher Royale', 'Diskon karyawan', 'Promo happy hour']) : ''

  const afterDiscount = subtotal - discountAmount
  const type = pickOrderType()
  const serviceAmount =
    DEFAULT_SETTINGS.service_enabled && type === 'dine_in'
      ? Math.round((afterDiscount * DEFAULT_SETTINGS.service_percent) / 100)
      : 0
  const taxAmount = DEFAULT_SETTINGS.tax_enabled
    ? Math.round(((afterDiscount + serviceAmount) * DEFAULT_SETTINGS.tax_percent) / 100)
    : 0
  const total = afterDiscount + serviceAmount + taxAmount

  const table = type === 'dine_in' ? pick(TABLES) : null
  const isCancelled = chance(0.018)
  const isRefunded = !isCancelled && chance(0.012)

  const status: Order['status'] = isCancelled ? 'cancelled' : isRefunded ? 'refunded' : 'completed'

  const order: Order = {
    id: orderId,
    order_number: `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`,
    type,
    status,
    table_id: table?.id ?? null,
    table_name: table?.name ?? null,
    customer_name: chance(0.55) ? pick(CUSTOMER_NAMES) : '',
    guest_count: type === 'dine_in' ? between(1, 4) : 1,
    items,
    subtotal,
    discount_amount: discountAmount,
    discount_note: discountNote,
    tax_amount: taxAmount,
    service_amount: serviceAmount,
    total,
    note: pick(ORDER_NOTES),
    cashier_id: CASHIER.id,
    cashier_name: CASHIER.name,
    cancel_reason: isCancelled ? pick(CANCEL_REASONS) : null,
    refund_reason: isRefunded ? pick(REFUND_REASONS) : null,
    paid_at: isCancelled ? null : iso(date),
    created_at: iso(date),
    updated_at: iso(date),
  }

  if (isCancelled) return { order, payment: null, invoice: null }

  const method = pickPayment()
  const received =
    method === 'cash'
      ? Math.ceil(total / 5000) * 5000 + (chance(0.35) ? pick([0, 5000, 10000, 20000]) : 0)
      : total

  const payment: Payment = {
    id: `pay_${orderId}`,
    order_id: orderId,
    method,
    amount: total,
    received_amount: received,
    change_amount: Math.max(0, received - total),
    reference_number: method === 'cash' ? null : `${method.toUpperCase()}-${between(100000, 999999)}`,
    status: isRefunded ? 'refunded' : 'success',
    paid_at: iso(date),
    created_at: iso(date),
    updated_at: iso(date),
  }

  const invoice: Invoice = {
    id: `inv_${orderId}`,
    order_id: orderId,
    invoice_number: order.order_number.replace('ORD', 'INV'),
    issued_at: iso(date),
    printed_count: 1,
    created_at: iso(date),
    updated_at: iso(date),
  }

  return { order, payment, invoice }
}

/* ---------------------------- Generator utama ---------------------------- */

export interface GeneratedData {
  /** Status meja hasil turunan bill terbuka hari ini. */
  tables: RestaurantTable[]
  orders: Order[]
  payments: Payment[]
  invoices: Invoice[]
  targets: SalesTarget[]
  inventory: Inventory[]
  movements: StockMovement[]
  adjustments: StockAdjustment[]
  auditLogs: AuditLog[]
}

export function generateData(): GeneratedData {
  const orders: Order[] = []
  const payments: Payment[] = []
  const invoices: Invoice[] = []
  const auditLogs: AuditLog[] = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const now = new Date()

  let orderSeq = 0

  for (let dayOffset = HISTORY_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(today)
    day.setDate(today.getDate() - dayOffset)
    const dayIndex = HISTORY_DAYS - 1 - dayOffset
    const isToday = dayOffset === 0

    const factor = dayFactor(day, dayIndex)
    const targetOrders = Math.max(6, Math.round(between(26, 44) * factor * 0.85))

    /**
     * Untuk hari ini, transaksi hanya dibangkitkan pada jam yang sudah
     * terlewati dan jumlahnya diskalakan mengikuti proporsi bobot jam yang
     * sudah berjalan, sehingga volume terasa wajar sepanjang hari.
     */
    const lastHour = isToday ? Math.min(CLOSE_HOUR - 1, now.getHours()) : CLOSE_HOUR - 1
    const elapsedWeight = HOUR_WEIGHTS.filter(([h]) => h <= lastHour).reduce((a, [, w]) => a + w, 0)
    const elapsedRatio = isToday ? elapsedWeight / HOUR_TOTAL : 1
    const count = Math.round(targetOrders * elapsedRatio)

    const dayOrders: Order[] = []

    for (let i = 0; i < count; i += 1) {
      let hour = pickHour()
      if (hour > lastHour) hour = OPEN_HOUR + Math.floor(rand() * Math.max(1, lastHour - OPEN_HOUR + 1))
      const maxMinute = isToday && hour === now.getHours() ? Math.max(0, now.getMinutes() - 1) : 59
      const at = new Date(day)
      at.setHours(hour, between(0, maxMinute), between(0, 59), 0)
      if (isToday && at.getTime() > Date.now()) continue

      orderSeq += 1
      const built = buildOrder(at, orderSeq)
      dayOrders.push(built.order)
      if (built.payment) payments.push(built.payment)
      if (built.invoice) invoices.push(built.invoice)
    }

    dayOrders.sort((a, b) => a.created_at.localeCompare(b.created_at))
    orders.push(...dayOrders)

    // Audit ringkas untuk transaksi bermasalah
    for (const o of dayOrders) {
      if (o.status === 'cancelled') {
        auditLogs.push({
          id: `aud_cancel_${o.id}`,
          user_id: o.cashier_id,
          user_name: o.cashier_name,
          action: 'transaction_cancelled',
          description: `Membatalkan ${o.order_number}: ${o.cancel_reason}`,
          reference_id: o.id,
          ip_address: '192.168.1.' + between(10, 99),
          created_at: o.created_at,
          updated_at: o.created_at,
        })
      } else if (o.status === 'refunded') {
        auditLogs.push({
          id: `aud_refund_${o.id}`,
          user_id: OWNER.id,
          user_name: OWNER.name,
          action: 'refund',
          description: `Refund ${o.order_number}: ${o.refund_reason}`,
          reference_id: o.id,
          ip_address: '192.168.1.' + between(10, 99),
          created_at: o.created_at,
          updated_at: o.created_at,
        })
      }
    }
  }

  /* ------------------------- Bill terbuka hari ini ----------------------- */

  /**
   * Beberapa meja dibiarkan punya bill berjalan agar denah meja tidak kosong
   * saat aplikasi pertama dibuka. Bill ini berstatus `pending`, belum dibayar.
   */
  const liveTables = TABLES.map((t) => ({ ...t, status: 'available' as RestaurantTable['status'] }))
  const occupiedIdx = [2, 6, 9]
  const reservedIdx = [10]

  for (const idx of occupiedIdx) {
    const table = liveTables[idx]
    if (!table) continue

    const openedAt = new Date(now.getTime() - between(12, 95) * 60_000)
    if (openedAt.getHours() < OPEN_HOUR) openedAt.setHours(OPEN_HOUR, between(5, 40), 0, 0)

    orderSeq += 1
    const built = buildOrder(openedAt, orderSeq)

    // Ubah menjadi bill terbuka: belum dibayar, terikat pada meja ini.
    const bill: Order = {
      ...built.order,
      type: 'dine_in',
      status: 'pending',
      table_id: table.id,
      table_name: table.name,
      guest_count: between(2, Math.max(2, table.capacity)),
      cancel_reason: null,
      refund_reason: null,
      paid_at: null,
      // Service charge & pajak tetap dihitung agar totalnya realistis.
      updated_at: iso(openedAt),
    }

    orders.push(bill)
    liveTables[idx] = { ...table, status: 'occupied' }
  }

  for (const idx of reservedIdx) {
    if (liveTables[idx]) liveTables[idx] = { ...liveTables[idx], status: 'reserved' }
  }

  /* --------------------------- Target penjualan ------------------------- */

  /**
   * Target dikalibrasi dari omzet yang benar-benar terjadi, bukan angka
   * sembarang: bulan lampau memakai faktor 0,9–1,08 dari realisasi sehingga
   * ada bulan yang tercapai dan ada yang meleset, sementara bulan berjalan
   * memakai proyeksi omzet penuh agar statusnya wajar sejak awal bulan.
   */
  const targets: SalesTarget[] = []
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  const revenueByMonth = new Map<string, { revenue: number; transactions: number }>()
  for (const o of orders) {
    if (o.status === 'cancelled' || o.status === 'refunded') continue
    const key = monthKey(new Date(o.created_at))
    const entry = revenueByMonth.get(key) ?? { revenue: 0, transactions: 0 }
    entry.revenue += o.total
    entry.transactions += 1
    revenueByMonth.set(key, entry)
  }

  const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step)
  const currentKey = monthKey(now)
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  let currentTargetRevenue = 0

  for (let i = -5; i <= 1; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const period = monthKey(d)
    const actual = revenueByMonth.get(period)

    let revenueTarget = 0
    let transactionTarget = 0

    if (period === currentKey && actual) {
      // Proyeksikan omzet satu bulan penuh dari laju sejauh ini.
      const ratio = daysInCurrentMonth / Math.max(1, now.getDate())
      revenueTarget = roundTo(actual.revenue * ratio * 0.97, 5_000_000)
      transactionTarget = roundTo(actual.transactions * ratio * 0.97, 50)
      currentTargetRevenue = revenueTarget
    } else if (i === 1) {
      revenueTarget = roundTo((currentTargetRevenue || DEFAULT_MONTHLY_REVENUE_TARGET) * 1.05, 5_000_000)
      transactionTarget = roundTo(DEFAULT_MONTHLY_TRANSACTION_TARGET * 1.05, 50)
    } else if (actual && actual.revenue > 0) {
      const factor = 0.9 + rand() * 0.18
      revenueTarget = roundTo(actual.revenue * factor, 5_000_000)
      transactionTarget = roundTo(actual.transactions * factor, 50)
    } else {
      continue // bulan tanpa data penjualan tidak diberi target
    }

    targets.push({
      id: `tgt_${period}`,
      period,
      revenue_target: revenueTarget,
      transaction_target: transactionTarget,
      note: i < 0 ? 'Target periode lalu' : i === 0 ? 'Target bulan berjalan' : 'Rencana bulan depan',
      created_at: iso(d),
      updated_at: iso(d),
    })
  }

  /* ----------------------------- Inventori ------------------------------ */

  const sold30 = new Map<string, number>()
  const cutoff = Date.now() - 30 * 86400000
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    if (new Date(o.created_at).getTime() < cutoff) continue
    for (const it of o.items) sold30.set(it.product_id, (sold30.get(it.product_id) ?? 0) + it.quantity)
  }

  const unitFor = (p: Product): Inventory['unit'] => {
    if (p.category_id === 'cat_coffee' || p.category_id === 'cat_beverage') return 'cup'
    if (p.category_id === 'cat_addon') return 'pcs'
    return 'porsi'
  }

  const inventory: Inventory[] = PRODUCTS.map((p, idx) => {
    const velocity = Math.max(1, Math.round((sold30.get(p.id) ?? 10) / 30))
    const min = Math.max(8, velocity * 4)
    const max = Math.max(min * 5, velocity * 25)

    // Sebar kondisi stok agar semua status muncul di dashboard warehouse.
    let quantity: number
    if (idx % 17 === 3) quantity = 0
    else if (idx % 13 === 5) quantity = Math.max(1, Math.round(min * 0.35))
    else if (idx % 7 === 2) quantity = Math.round(min * 0.85)
    else quantity = between(Math.round(min * 1.6), max)

    const lastIn = new Date()
    lastIn.setDate(lastIn.getDate() - between(1, 20))
    const lastCount = new Date()
    lastCount.setDate(lastCount.getDate() - between(3, 45))

    return {
      id: `inv_${p.id}`,
      product_id: p.id,
      quantity,
      min_quantity: min,
      max_quantity: max,
      unit: unitFor(p),
      location: p.category_id === 'cat_coffee' ? 'Bar Station' : p.category_id === 'cat_food' ? 'Kitchen Store' : 'Gudang Utama',
      last_stock_in_at: iso(lastIn),
      last_counted_at: iso(lastCount),
      created_at: iso(lastIn),
      updated_at: iso(lastIn),
    }
  })

  /* -------------------------- Stock movements --------------------------- */

  const movements: StockMovement[] = []
  const warehouseUser = USERS.find((u) => u.role_id === 'warehouse')!
  const invMap = new Map(inventory.map((i) => [i.product_id, i]))

  const recentOrders = orders
    .filter((o) => o.status !== 'cancelled' && new Date(o.created_at).getTime() >= cutoff)
    .slice(-260)

  for (const o of recentOrders) {
    for (const it of o.items) {
      if (!invMap.has(it.product_id)) continue
      movements.push({
        id: `mv_sale_${it.id}`,
        product_id: it.product_id,
        type: 'sales_deduction',
        quantity_before: 0,
        quantity_change: -it.quantity,
        quantity_after: 0,
        reason: `Penjualan ${o.order_number}`,
        reference_id: o.id,
        user_id: o.cashier_id,
        user_name: o.cashier_name,
        created_at: o.created_at,
        updated_at: o.created_at,
      })
    }
  }

  const reasonMap: Record<StockMovement['type'], string[]> = {
    stock_in: ['Penerimaan dari supplier', 'Restock mingguan', 'Pembelian tambahan'],
    stock_out: ['Transfer ke cabang', 'Pemakaian internal'],
    waste: ['Produk rusak', 'Kedaluwarsa', 'Tumpah saat penyajian'],
    adjustment: ['Koreksi input', 'Penyesuaian setelah audit'],
    opname: ['Hasil stok opname bulanan', 'Hasil perhitungan fisik'],
    sales_deduction: ['Penjualan'],
    return: ['Retur ke supplier'],
  }

  for (let i = 0; i < 90; i += 1) {
    const product = pick(PRODUCTS)
    const at = new Date()
    at.setDate(at.getDate() - between(0, 30))
    at.setHours(between(7, 19), between(0, 59), 0, 0)
    const type = pick<StockMovement['type']>(['stock_in', 'stock_in', 'stock_in', 'waste', 'adjustment', 'opname', 'stock_out'])
    const magnitude = type === 'stock_in' ? between(20, 80) : between(1, 8)
    const change = type === 'stock_in' ? magnitude : -magnitude
    const before = between(20, 140)

    movements.push({
      id: `mv_wh_${i}`,
      product_id: product.id,
      type,
      quantity_before: before,
      quantity_change: change,
      quantity_after: before + change,
      reason: pick(reasonMap[type]),
      reference_id: null,
      user_id: warehouseUser.id,
      user_name: warehouseUser.name,
      created_at: iso(at),
      updated_at: iso(at),
    })
  }

  movements.sort((a, b) => b.created_at.localeCompare(a.created_at))

  /* --------------------------- Stock adjustments ------------------------- */

  const adjustments: StockAdjustment[] = Array.from({ length: 8 }, (_, i) => {
    const product = pick(PRODUCTS)
    const at = new Date()
    at.setDate(at.getDate() - between(0, 14))
    const system = between(20, 90)
    const counted = system + pick([-6, -4, -3, -2, -1, 1, 2, 3])
    return {
      id: `adj_${i}`,
      product_id: product.id,
      system_quantity: system,
      counted_quantity: counted,
      difference: counted - system,
      reason: pick(['Selisih hasil opname', 'Barang rusak belum tercatat', 'Kesalahan input penerimaan', 'Sample untuk tasting']),
      status: i < 3 ? 'pending' : i < 6 ? 'approved' : 'rejected',
      requested_by: warehouseUser.id,
      requested_by_name: warehouseUser.name,
      approved_by: i >= 3 && i < 6 ? OWNER.id : null,
      created_at: iso(at),
      updated_at: iso(at),
    }
  })

  /* ------------------------------ Audit log ----------------------------- */

  for (let i = 0; i < 14; i += 1) {
    const at = new Date()
    at.setDate(at.getDate() - between(0, 21))
    at.setHours(between(8, 20), between(0, 59), 0, 0)
    const user = pick(USERS)
    const actions: AuditLog['action'][] = [
      'login', 'logout', 'price_change', 'product_updated', 'stock_adjustment', 'settings_updated', 'target_updated',
    ]
    const action = pick(actions)
    const descMap: Record<string, string> = {
      login: 'Masuk ke sistem',
      logout: 'Keluar dari sistem',
      price_change: `Mengubah harga ${pick(PRODUCTS).name}`,
      product_updated: `Memperbarui data produk ${pick(PRODUCTS).name}`,
      stock_adjustment: `Menyesuaikan stok ${pick(PRODUCTS).name}`,
      settings_updated: 'Memperbarui pengaturan pajak & service charge',
      target_updated: 'Memperbarui target penjualan bulanan',
    }
    auditLogs.push({
      id: `aud_misc_${i}`,
      user_id: user.id,
      user_name: user.name,
      action,
      description: descMap[action],
      reference_id: null,
      ip_address: '192.168.1.' + between(10, 99),
      created_at: iso(at),
      updated_at: iso(at),
    })
  }

  auditLogs.sort((a, b) => b.created_at.localeCompare(a.created_at))
  orders.sort((a, b) => b.created_at.localeCompare(a.created_at))
  payments.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return { tables: liveTables, orders, payments, invoices, targets, inventory, movements, adjustments, auditLogs }
}

export { CATEGORIES, PRODUCTS, USERS, TABLES }
