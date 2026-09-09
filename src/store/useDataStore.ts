import { create } from 'zustand'
import { loadDatabase, persistDatabase, resetDatabase, type Database } from '@/db/database'
import { uid } from '@/lib/utils'
import type {
  AuditAction,
  AuditLog,
  Category,
  Order,
  OrderItem,
  Payment,
  PaymentMethodCode,
  Product,
  SalesTarget,
  StockAdjustment,
  StockMovement,
  StockMovementType,
  StoreSettings,
  User,
} from '@/types'

const nowISO = () => new Date().toISOString()

export interface CheckoutInput {
  type: Order['type']
  tableId: string | null
  tableName: string | null
  customerName: string
  guestCount: number
  items: OrderItem[]
  subtotal: number
  discountAmount: number
  discountNote: string
  taxAmount: number
  serviceAmount: number
  total: number
  note: string
  method: PaymentMethodCode
  receivedAmount: number
  referenceNumber: string | null
  cashier: User
  /** Bila diisi, bill terbuka inilah yang dilunasi — bukan pesanan baru. */
  billId?: string | null
}

/** Data yang disimpan ke bill terbuka (belum dibayar). */
export interface BillInput {
  billId: string
  items: OrderItem[]
  subtotal: number
  discountAmount: number
  discountNote: string
  taxAmount: number
  serviceAmount: number
  total: number
  note: string
  customerName: string
  guestCount: number
  user: User
}

export interface CheckoutResult {
  order: Order
  payment: Payment
  invoiceNumber: string
}

interface DataState {
  db: Database
  ready: boolean

  /* --- helpers --- */
  refresh: () => void
  reset: () => void
  log: (userId: string, userName: string, action: AuditAction, description: string, referenceId?: string | null) => void

  /* --- transaksi --- */
  checkout: (input: CheckoutInput) => CheckoutResult
  cancelOrder: (orderId: string, reason: string, user: User) => void
  refundOrder: (orderId: string, reason: string, user: User) => void

  /* --- bill terbuka (table service) --- */
  openBill: (tableId: string, guestCount: number, customerName: string, user: User) => Order
  saveBill: (input: BillInput) => void
  cancelBill: (billId: string, reason: string, user: User) => void

  /* --- target penjualan --- */
  saveTarget: (target: SalesTarget, user: User) => void

  /* --- master data --- */
  saveProduct: (product: Product, user: User) => void
  deleteProduct: (productId: string, user: User) => void
  saveCategory: (category: Category, user: User) => void
  deleteCategory: (categoryId: string, user: User) => void
  saveUser: (user: User, actor: User) => void
  deleteUser: (userId: string, actor: User) => void
  updateSettings: (settings: StoreSettings, user: User) => void
  updateRolePermissions: (roleId: string, permissions: Role['permissions'], actor: User) => void

  /* --- inventori --- */
  adjustStock: (
    productId: string,
    type: StockMovementType,
    quantityChange: number,
    reason: string,
    user: User,
  ) => void
  submitOpname: (productId: string, countedQuantity: number, reason: string, user: User) => void
  reviewAdjustment: (adjustmentId: string, approve: boolean, actor: User) => void
  setTableStatus: (tableId: string, status: Database['tables'][number]['status']) => void
  markInvoicePrinted: (orderId: string) => void
}

type Role = Database['roles'][number]

/** Ringkas item pesanan menjadi peta produk → total kuantitas. */
function quantityMap(items: OrderItem[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) map.set(item.product_id, (map.get(item.product_id) ?? 0) + item.quantity)
  return map
}

/**
 * Sesuaikan stok berdasarkan selisih item sebelum dan sesudah. Dipakai bill
 * terbuka: menambah item memotong stok, menghapus item mengembalikannya —
 * tanpa pernah memotong dua kali saat bill akhirnya dibayar.
 */
function applyStockDiff(
  db: Database,
  before: OrderItem[],
  after: OrderItem[],
  reason: string,
  referenceId: string | null,
  user: User,
  at: string,
): { inventory: Database['inventory']; movements: StockMovement[] } {
  const prev = quantityMap(before)
  const next = quantityMap(after)
  const productIds = new Set([...prev.keys(), ...next.keys()])

  const inventory = [...db.inventory]
  const movements: StockMovement[] = []

  for (const productId of productIds) {
    const delta = (next.get(productId) ?? 0) - (prev.get(productId) ?? 0)
    if (delta === 0) continue

    const product = db.products.find((p) => p.id === productId)
    if (product && !product.track_stock) continue

    const idx = inventory.findIndex((i) => i.product_id === productId)
    if (idx === -1) continue

    const beforeQty = inventory[idx].quantity
    const afterQty = Math.max(0, beforeQty - delta)
    inventory[idx] = { ...inventory[idx], quantity: afterQty, updated_at: at }

    movements.push({
      id: uid('mv'),
      product_id: productId,
      type: delta > 0 ? 'sales_deduction' : 'return',
      quantity_before: beforeQty,
      quantity_change: -delta,
      quantity_after: afterQty,
      reason,
      reference_id: referenceId,
      user_id: user.id,
      user_name: user.name,
      created_at: at,
      updated_at: at,
    })
  }

  return { inventory, movements }
}

function commit(set: (fn: (state: DataState) => Partial<DataState>) => void, mutate: (db: Database) => Database) {
  set((state) => {
    const next = mutate(state.db)
    persistDatabase(next)
    return { db: next }
  })
}

export const useDataStore = create<DataState>((set, get) => ({
  db: loadDatabase(),
  ready: true,

  refresh: () => set({ db: loadDatabase() }),

  reset: () => {
    const fresh = resetDatabase()
    set({ db: fresh })
  },

  log: (userId, userName, action, description, referenceId = null) => {
    commit(set, (db) => {
      const entry: AuditLog = {
        id: uid('aud'),
        user_id: userId,
        user_name: userName,
        action,
        description,
        reference_id: referenceId,
        ip_address: '192.168.1.10',
        created_at: nowISO(),
        updated_at: nowISO(),
      }
      return { ...db, audit_logs: [entry, ...db.audit_logs] }
    })
  },

  /* ------------------------------ Checkout ------------------------------ */

  checkout: (input) => {
    const at = nowISO()
    const date = new Date()
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const db = get().db

    // Melunasi bill terbuka: pakai kembali pesanan & nomor yang sudah ada.
    const existing = input.billId ? db.orders.find((o) => o.id === input.billId) : undefined
    const todayCount = db.orders.filter((o) => o.order_number.includes(stamp)).length + 1
    const orderNumber = existing?.order_number ?? `ORD-${stamp}-${String(todayCount).padStart(4, '0')}`
    const orderId = existing?.id ?? uid('ord')

    const items = input.items.map((it) => ({ ...it, order_id: orderId }))

    const order: Order = {
      id: orderId,
      order_number: orderNumber,
      type: input.type,
      status: 'completed',
      table_id: input.tableId,
      table_name: input.tableName,
      customer_name: input.customerName,
      guest_count: input.guestCount,
      items,
      subtotal: input.subtotal,
      discount_amount: input.discountAmount,
      discount_note: input.discountNote,
      tax_amount: input.taxAmount,
      service_amount: input.serviceAmount,
      total: input.total,
      note: input.note,
      cashier_id: input.cashier.id,
      cashier_name: input.cashier.name,
      cancel_reason: null,
      refund_reason: null,
      paid_at: at,
      created_at: existing?.created_at ?? at,
      updated_at: at,
    }

    const payment: Payment = {
      id: uid('pay'),
      order_id: orderId,
      method: input.method,
      amount: input.total,
      received_amount: input.receivedAmount,
      change_amount: Math.max(0, input.receivedAmount - input.total),
      reference_number: input.referenceNumber,
      status: 'success',
      paid_at: at,
      created_at: at,
      updated_at: at,
    }

    const invoiceNumber = orderNumber.replace('ORD', 'INV')

    commit(set, (current) => {
      /*
       * Stok bill terbuka sudah dipotong saat item disimpan, jadi pelunasan
       * hanya menyesuaikan sisa selisihnya. Pesanan langsung (Take Away /
       * Delivery) dipotong penuh di sini.
       */
      const { inventory, movements } = applyStockDiff(
        current,
        existing?.items ?? [],
        items,
        `Penjualan ${orderNumber}`,
        orderId,
        input.cashier,
        at,
      )

      const tables = input.tableId
        ? current.tables.map((t) => (t.id === input.tableId ? { ...t, status: 'available' as const, updated_at: at } : t))
        : current.tables

      const auditEntry: AuditLog = {
        id: uid('aud'),
        user_id: input.cashier.id,
        user_name: input.cashier.name,
        action: 'transaction_created',
        description: `Transaksi ${orderNumber} berhasil dibayar`,
        reference_id: orderId,
        ip_address: '192.168.1.10',
        created_at: at,
        updated_at: at,
      }

      return {
        ...current,
        orders: existing
          ? current.orders.map((o) => (o.id === orderId ? order : o))
          : [order, ...current.orders],
        payments: [payment, ...current.payments],
        invoices: [
          { id: uid('inv'), order_id: orderId, invoice_number: invoiceNumber, issued_at: at, printed_count: 0, created_at: at, updated_at: at },
          ...current.invoices,
        ],
        inventory,
        stock_movements: [...movements, ...current.stock_movements],
        tables,
        audit_logs: [auditEntry, ...current.audit_logs],
      }
    })

    return { order, payment, invoiceNumber }
  },

  cancelOrder: (orderId, reason, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const order = db.orders.find((o) => o.id === orderId)
      if (!order || order.status === 'cancelled') return db

      // Kembalikan stok yang sudah terpotong.
      const inventory = [...db.inventory]
      const movements: StockMovement[] = []
      for (const item of order.items) {
        const idx = inventory.findIndex((i) => i.product_id === item.product_id)
        if (idx === -1) continue
        const before = inventory[idx].quantity
        const after = before + item.quantity
        inventory[idx] = { ...inventory[idx], quantity: after, updated_at: at }
        movements.push({
          id: uid('mv'),
          product_id: item.product_id,
          type: 'return',
          quantity_before: before,
          quantity_change: item.quantity,
          quantity_after: after,
          reason: `Pembatalan ${order.order_number}`,
          reference_id: orderId,
          user_id: user.id,
          user_name: user.name,
          created_at: at,
          updated_at: at,
        })
      }

      return {
        ...db,
        orders: db.orders.map((o) =>
          o.id === orderId ? { ...o, status: 'cancelled' as const, cancel_reason: reason, updated_at: at } : o,
        ),
        payments: db.payments.map((p) => (p.order_id === orderId ? { ...p, status: 'refunded' as const, updated_at: at } : p)),
        inventory,
        stock_movements: [...movements, ...db.stock_movements],
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'transaction_cancelled' as const,
            description: `Void ${order.order_number} — ${reason}`,
            reference_id: orderId,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  refundOrder: (orderId, reason, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const order = db.orders.find((o) => o.id === orderId)
      if (!order) return db
      return {
        ...db,
        orders: db.orders.map((o) =>
          o.id === orderId ? { ...o, status: 'refunded' as const, refund_reason: reason, updated_at: at } : o,
        ),
        payments: db.payments.map((p) => (p.order_id === orderId ? { ...p, status: 'refunded' as const, updated_at: at } : p)),
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'refund' as const,
            description: `Refund ${order.order_number} — ${reason}`,
            reference_id: orderId,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  /* ------------------------- Bill terbuka (meja) ------------------------- */

  openBill: (tableId, guestCount, customerName, user) => {
    const at = nowISO()
    const d = new Date()
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const db = get().db
    const table = db.tables.find((t) => t.id === tableId)
    const seq = db.orders.filter((o) => o.order_number.includes(stamp)).length + 1

    const bill: Order = {
      id: uid('ord'),
      order_number: `ORD-${stamp}-${String(seq).padStart(4, '0')}`,
      type: 'dine_in',
      status: 'pending',
      table_id: tableId,
      table_name: table?.name ?? null,
      customer_name: customerName,
      guest_count: Math.max(1, guestCount),
      items: [],
      subtotal: 0,
      discount_amount: 0,
      discount_note: '',
      tax_amount: 0,
      service_amount: 0,
      total: 0,
      note: '',
      cashier_id: user.id,
      cashier_name: user.name,
      cancel_reason: null,
      refund_reason: null,
      paid_at: null,
      created_at: at,
      updated_at: at,
    }

    commit(set, (current) => ({
      ...current,
      orders: [bill, ...current.orders],
      tables: current.tables.map((t) => (t.id === tableId ? { ...t, status: 'occupied' as const, updated_at: at } : t)),
      audit_logs: [
        {
          id: uid('aud'),
          user_id: user.id,
          user_name: user.name,
          action: 'transaction_created' as const,
          description: `Membuka bill ${bill.order_number} untuk ${table?.name ?? 'meja'}`,
          reference_id: bill.id,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        },
        ...current.audit_logs,
      ],
    }))

    return bill
  },

  saveBill: (input) => {
    const at = nowISO()
    commit(set, (db) => {
      const bill = db.orders.find((o) => o.id === input.billId)
      if (!bill || bill.status !== 'pending') return db

      const items = input.items.map((it) => ({ ...it, order_id: bill.id }))

      // Stok mengikuti isi bill saat itu juga — makanan sudah dibuat dapur.
      const { inventory, movements } = applyStockDiff(
        db,
        bill.items,
        items,
        `Bill ${bill.order_number}`,
        bill.id,
        input.user,
        at,
      )

      const updated: Order = {
        ...bill,
        items,
        subtotal: input.subtotal,
        discount_amount: input.discountAmount,
        discount_note: input.discountNote,
        tax_amount: input.taxAmount,
        service_amount: input.serviceAmount,
        total: input.total,
        note: input.note,
        customer_name: input.customerName,
        guest_count: Math.max(1, input.guestCount),
        updated_at: at,
      }

      return {
        ...db,
        orders: db.orders.map((o) => (o.id === bill.id ? updated : o)),
        inventory,
        stock_movements: [...movements, ...db.stock_movements],
      }
    })
  },

  cancelBill: (billId, reason, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const bill = db.orders.find((o) => o.id === billId)
      if (!bill || bill.status !== 'pending') return db

      // Kembalikan seluruh stok yang sempat dipotong bill ini.
      const { inventory, movements } = applyStockDiff(
        db,
        bill.items,
        [],
        `Pembatalan bill ${bill.order_number} — ${reason}`,
        bill.id,
        user,
        at,
      )

      return {
        ...db,
        orders: db.orders.map((o) =>
          o.id === billId ? { ...o, status: 'cancelled' as const, cancel_reason: reason, updated_at: at } : o,
        ),
        inventory,
        stock_movements: [...movements, ...db.stock_movements],
        tables: bill.table_id
          ? db.tables.map((t) => (t.id === bill.table_id ? { ...t, status: 'available' as const, updated_at: at } : t))
          : db.tables,
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'transaction_cancelled' as const,
            description: `Membatalkan bill ${bill.order_number} — ${reason}`,
            reference_id: bill.id,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  /* --------------------------- Target penjualan -------------------------- */

  saveTarget: (target, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const exists = db.targets.some((t) => t.period === target.period)
      return {
        ...db,
        targets: exists
          ? db.targets.map((t) => (t.period === target.period ? { ...target, id: t.id, created_at: t.created_at, updated_at: at } : t))
          : [...db.targets, { ...target, created_at: at, updated_at: at }].sort((a, b) => a.period.localeCompare(b.period)),
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'target_updated' as const,
            description: `Menetapkan target ${target.period}: omzet ${target.revenue_target}, transaksi ${target.transaction_target}`,
            reference_id: target.period,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  /* ----------------------------- Master data ---------------------------- */

  saveProduct: (product, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const exists = db.products.some((p) => p.id === product.id)
      const previous = db.products.find((p) => p.id === product.id)
      const priceChanged = previous && previous.price !== product.price

      const products = exists
        ? db.products.map((p) => (p.id === product.id ? { ...product, updated_at: at } : p))
        : [{ ...product, created_at: at, updated_at: at }, ...db.products]

      const inventory = db.inventory.some((i) => i.product_id === product.id)
        ? db.inventory
        : [
            ...db.inventory,
            {
              id: uid('inv'),
              product_id: product.id,
              quantity: 0,
              min_quantity: 10,
              max_quantity: 100,
              unit: 'pcs' as const,
              location: 'Gudang Utama',
              last_stock_in_at: null,
              last_counted_at: null,
              created_at: at,
              updated_at: at,
            },
          ]

      const logs: AuditLog[] = [
        {
          id: uid('aud'),
          user_id: user.id,
          user_name: user.name,
          action: exists ? ('product_updated' as const) : ('product_created' as const),
          description: `${exists ? 'Memperbarui' : 'Menambahkan'} produk ${product.name}`,
          reference_id: product.id,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        },
      ]
      if (priceChanged) {
        logs.unshift({
          id: uid('aud'),
          user_id: user.id,
          user_name: user.name,
          action: 'price_change',
          description: `Harga ${product.name} diubah dari ${previous!.price} menjadi ${product.price}`,
          reference_id: product.id,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        })
      }

      return { ...db, products, inventory, audit_logs: [...logs, ...db.audit_logs] }
    })
  },

  deleteProduct: (productId, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const product = db.products.find((p) => p.id === productId)
      return {
        ...db,
        products: db.products.filter((p) => p.id !== productId),
        inventory: db.inventory.filter((i) => i.product_id !== productId),
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'product_updated' as const,
            description: `Menghapus produk ${product?.name ?? productId}`,
            reference_id: productId,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  saveCategory: (category, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const exists = db.categories.some((c) => c.id === category.id)
      return {
        ...db,
        categories: exists
          ? db.categories.map((c) => (c.id === category.id ? { ...category, updated_at: at } : c))
          : [...db.categories, { ...category, created_at: at, updated_at: at }],
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'settings_updated' as const,
            description: `${exists ? 'Memperbarui' : 'Menambahkan'} kategori ${category.name}`,
            reference_id: category.id,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  deleteCategory: (categoryId, user) => {
    const at = nowISO()
    commit(set, (db) => ({
      ...db,
      categories: db.categories.filter((c) => c.id !== categoryId),
      audit_logs: [
        {
          id: uid('aud'),
          user_id: user.id,
          user_name: user.name,
          action: 'settings_updated' as const,
          description: `Menghapus kategori ${db.categories.find((c) => c.id === categoryId)?.name ?? categoryId}`,
          reference_id: categoryId,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        },
        ...db.audit_logs,
      ],
    }))
  },

  saveUser: (user, actor) => {
    const at = nowISO()
    commit(set, (db) => {
      const exists = db.users.some((u) => u.id === user.id)
      return {
        ...db,
        users: exists
          ? db.users.map((u) => (u.id === user.id ? { ...user, updated_at: at } : u))
          : [...db.users, { ...user, created_at: at, updated_at: at }],
        audit_logs: [
          {
            id: uid('aud'),
            user_id: actor.id,
            user_name: actor.name,
            action: exists ? ('user_updated' as const) : ('user_created' as const),
            description: `${exists ? 'Memperbarui' : 'Menambahkan'} pengguna ${user.name} (${user.role_id})`,
            reference_id: user.id,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  deleteUser: (userId, actor) => {
    const at = nowISO()
    commit(set, (db) => ({
      ...db,
      users: db.users.filter((u) => u.id !== userId),
      audit_logs: [
        {
          id: uid('aud'),
          user_id: actor.id,
          user_name: actor.name,
          action: 'user_updated' as const,
          description: `Menonaktifkan/menghapus pengguna ${db.users.find((u) => u.id === userId)?.name ?? userId}`,
          reference_id: userId,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        },
        ...db.audit_logs,
      ],
    }))
  },

  updateSettings: (settings, user) => {
    const at = nowISO()
    commit(set, (db) => ({
      ...db,
      settings,
      audit_logs: [
        {
          id: uid('aud'),
          user_id: user.id,
          user_name: user.name,
          action: 'settings_updated' as const,
          description: 'Memperbarui pengaturan bisnis, pajak, dan struk',
          reference_id: null,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        },
        ...db.audit_logs,
      ],
    }))
  },

  updateRolePermissions: (roleId, permissions, actor) => {
    const at = nowISO()
    commit(set, (db) => ({
      ...db,
      roles: db.roles.map((r) => (r.id === roleId ? { ...r, permissions, updated_at: at } : r)),
      audit_logs: [
        {
          id: uid('aud'),
          user_id: actor.id,
          user_name: actor.name,
          action: 'permission_change' as const,
          description: `Mengubah hak akses role ${db.roles.find((r) => r.id === roleId)?.label ?? roleId}`,
          reference_id: roleId,
          ip_address: '192.168.1.10',
          created_at: at,
          updated_at: at,
        },
        ...db.audit_logs,
      ],
    }))
  },

  /* ------------------------------ Inventori ----------------------------- */

  adjustStock: (productId, type, quantityChange, reason, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const idx = db.inventory.findIndex((i) => i.product_id === productId)
      if (idx === -1) return db
      const before = db.inventory[idx].quantity
      const after = Math.max(0, before + quantityChange)
      const inventory = [...db.inventory]
      inventory[idx] = {
        ...inventory[idx],
        quantity: after,
        last_stock_in_at: type === 'stock_in' ? at : inventory[idx].last_stock_in_at,
        updated_at: at,
      }

      const movement: StockMovement = {
        id: uid('mv'),
        product_id: productId,
        type,
        quantity_before: before,
        quantity_change: quantityChange,
        quantity_after: after,
        reason,
        reference_id: null,
        user_id: user.id,
        user_name: user.name,
        created_at: at,
        updated_at: at,
      }

      return {
        ...db,
        inventory,
        stock_movements: [movement, ...db.stock_movements],
        audit_logs: [
          {
            id: uid('aud'),
            user_id: user.id,
            user_name: user.name,
            action: 'stock_adjustment' as const,
            description: `${db.products.find((p) => p.id === productId)?.name ?? productId}: ${before} → ${after} (${reason})`,
            reference_id: productId,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  submitOpname: (productId, countedQuantity, reason, user) => {
    const at = nowISO()
    commit(set, (db) => {
      const inv = db.inventory.find((i) => i.product_id === productId)
      if (!inv) return db
      const adjustment: StockAdjustment = {
        id: uid('adj'),
        product_id: productId,
        system_quantity: inv.quantity,
        counted_quantity: countedQuantity,
        difference: countedQuantity - inv.quantity,
        reason,
        status: 'pending',
        requested_by: user.id,
        requested_by_name: user.name,
        approved_by: null,
        created_at: at,
        updated_at: at,
      }
      return {
        ...db,
        stock_adjustments: [adjustment, ...db.stock_adjustments],
        inventory: db.inventory.map((i) => (i.product_id === productId ? { ...i, last_counted_at: at, updated_at: at } : i)),
      }
    })
  },

  reviewAdjustment: (adjustmentId, approve, actor) => {
    const at = nowISO()
    commit(set, (db) => {
      const adj = db.stock_adjustments.find((a) => a.id === adjustmentId)
      if (!adj || adj.status !== 'pending') return db

      let inventory = db.inventory
      let movements = db.stock_movements

      if (approve) {
        const idx = db.inventory.findIndex((i) => i.product_id === adj.product_id)
        if (idx !== -1) {
          const before = db.inventory[idx].quantity
          const after = Math.max(0, adj.counted_quantity)
          inventory = [...db.inventory]
          inventory[idx] = { ...inventory[idx], quantity: after, last_counted_at: at, updated_at: at }
          movements = [
            {
              id: uid('mv'),
              product_id: adj.product_id,
              type: 'opname' as const,
              quantity_before: before,
              quantity_change: after - before,
              quantity_after: after,
              reason: `Opname disetujui — ${adj.reason}`,
              reference_id: adj.id,
              user_id: actor.id,
              user_name: actor.name,
              created_at: at,
              updated_at: at,
            },
            ...db.stock_movements,
          ]
        }
      }

      return {
        ...db,
        inventory,
        stock_movements: movements,
        stock_adjustments: db.stock_adjustments.map((a) =>
          a.id === adjustmentId
            ? { ...a, status: approve ? ('approved' as const) : ('rejected' as const), approved_by: actor.id, updated_at: at }
            : a,
        ),
        audit_logs: [
          {
            id: uid('aud'),
            user_id: actor.id,
            user_name: actor.name,
            action: 'stock_adjustment' as const,
            description: `${approve ? 'Menyetujui' : 'Menolak'} penyesuaian stok ${db.products.find((p) => p.id === adj.product_id)?.name ?? ''}`,
            reference_id: adjustmentId,
            ip_address: '192.168.1.10',
            created_at: at,
            updated_at: at,
          },
          ...db.audit_logs,
        ],
      }
    })
  },

  setTableStatus: (tableId, status) => {
    const at = nowISO()
    commit(set, (db) => ({
      ...db,
      tables: db.tables.map((t) => (t.id === tableId ? { ...t, status, updated_at: at } : t)),
    }))
  },

  markInvoicePrinted: (orderId) => {
    commit(set, (db) => ({
      ...db,
      invoices: db.invoices.map((i) =>
        i.order_id === orderId ? { ...i, printed_count: i.printed_count + 1, updated_at: nowISO() } : i,
      ),
    }))
  },
}))
