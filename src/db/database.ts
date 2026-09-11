import { CATEGORIES, DEFAULT_SETTINGS, PAYMENT_METHODS, PRODUCTS, USERS } from '@/data/catalog'
import { generateData } from '@/data/generate'
import { buildRoles } from '@/lib/rbac'
import type {
  AuditLog,
  Category,
  Inventory,
  Invoice,
  Order,
  Payment,
  PaymentMethod,
  Product,
  RestaurantTable,
  Role,
  SalesTarget,
  StockAdjustment,
  StockMovement,
  StoreSettings,
  User,
} from '@/types'

/**
 * ============================================================================
 *  DATABASE LAYER
 *  Implementasi saat ini menyimpan seluruh tabel di localStorage. Seluruh
 *  akses data pada aplikasi melewati modul ini, sehingga penggantian ke REST
 *  API / Prisma / Supabase cukup mengganti isi fungsi `load` & `persist`
 *  tanpa menyentuh lapisan UI.
 * ============================================================================
 */

export const DB_KEY = 'royale-pos-db'
export const DB_VERSION = 6

export interface Database {
  version: number
  seeded_at: string
  roles: Role[]
  users: User[]
  categories: Category[]
  products: Product[]
  tables: RestaurantTable[]
  payment_methods: PaymentMethod[]
  orders: Order[]
  payments: Payment[]
  invoices: Invoice[]
  targets: SalesTarget[]
  inventory: Inventory[]
  stock_movements: StockMovement[]
  stock_adjustments: StockAdjustment[]
  audit_logs: AuditLog[]
  settings: StoreSettings
}

export function createSeedDatabase(): Database {
  const now = new Date().toISOString()
  const generated = generateData()

  return {
    version: DB_VERSION,
    seeded_at: now,
    roles: buildRoles(now),
    users: USERS,
    categories: CATEGORIES,
    products: PRODUCTS,
    tables: generated.tables,
    payment_methods: PAYMENT_METHODS,
    orders: generated.orders,
    payments: generated.payments,
    invoices: generated.invoices,
    targets: generated.targets,
    inventory: generated.inventory,
    stock_movements: generated.movements,
    stock_adjustments: generated.adjustments,
    audit_logs: generated.auditLogs,
    settings: DEFAULT_SETTINGS,
  }
}

function safeStorage(): Storage | null {
  try {
    const probe = '__pos_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

/** Muat database. Bila belum ada / versi berbeda, buat ulang dari seed. */
export function loadDatabase(): Database {
  const storage = safeStorage()
  if (!storage) return createSeedDatabase()

  try {
    const raw = storage.getItem(DB_KEY)
    if (!raw) {
      const fresh = createSeedDatabase()
      storage.setItem(DB_KEY, JSON.stringify(fresh))
      return fresh
    }
    const parsed = JSON.parse(raw) as Database
    if (parsed.version !== DB_VERSION || !parsed.orders) {
      const fresh = createSeedDatabase()
      storage.setItem(DB_KEY, JSON.stringify(fresh))
      return fresh
    }
    // Master data selalu disegarkan dari kode agar perubahan katalog ikut terbawa.
    return { ...parsed, roles: buildRoles(parsed.seeded_at), payment_methods: parsed.payment_methods ?? PAYMENT_METHODS }
  } catch {
    return createSeedDatabase()
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null

/** Simpan database (debounce agar tidak memblokir interaksi POS). */
export function persistDatabase(db: Database): void {
  const storage = safeStorage()
  if (!storage) return
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    try {
      storage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      // Kuota localStorage penuh: pangkas riwayat lama lalu simpan ulang agar
      // transaksi terbaru tidak hilang saat halaman dimuat kembali.
      try {
        storage.setItem(DB_KEY, JSON.stringify(pruneHistory(db)))
        if (import.meta.env.DEV) {
          console.warn('[db] Kuota penyimpanan penuh. Riwayat lama dipangkas.')
        }
      } catch {
        /* tetap gagal, data hanya bertahan pada sesi ini */
      }
    }
  }, 250)
}

/** Jumlah hari riwayat yang dipertahankan ketika kuota penyimpanan penuh. */
const PRUNE_KEEP_DAYS = 30

/** Buang transaksi & pergerakan stok yang lebih tua dari PRUNE_KEEP_DAYS. */
function pruneHistory(db: Database): Database {
  const cutoff = Date.now() - PRUNE_KEEP_DAYS * 86_400_000
  const keep = (iso: string) => new Date(iso).getTime() >= cutoff

  const orders = db.orders.filter((o) => keep(o.created_at))
  const keptIds = new Set(orders.map((o) => o.id))

  return {
    ...db,
    orders,
    payments: db.payments.filter((p) => keptIds.has(p.order_id)),
    invoices: db.invoices.filter((i) => keptIds.has(i.order_id)),
    stock_movements: db.stock_movements.filter((m) => keep(m.created_at)),
    audit_logs: db.audit_logs.slice(0, 500),
  }
}

/** Reset penuh ke data demo awal. */
export function resetDatabase(): Database {
  const storage = safeStorage()
  const fresh = createSeedDatabase()
  storage?.setItem(DB_KEY, JSON.stringify(fresh))
  return fresh
}
