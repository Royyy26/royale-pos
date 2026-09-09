/**
 * ============================================================================
 *  DOMAIN TYPES — Royale POS
 *  Seluruh entitas mengikuti struktur tabel pada docs/schema.sql agar migrasi
 *  ke backend (PostgreSQL/MySQL) dapat dilakukan tanpa mengubah lapisan UI.
 * ============================================================================
 */

/** Kolom wajib untuk setiap tabel. */
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

/* --------------------------------- RBAC ---------------------------------- */

export type RoleName = 'owner' | 'kasir' | 'warehouse'

/** Daftar permission granular. Menu & aksi dikunci berdasarkan nilai ini. */
export type Permission =
  // POS & transaksi
  | 'pos.access'
  | 'pos.discount'
  | 'pos.void'
  | 'pos.refund'
  | 'order.view.own'
  | 'order.view.all'
  | 'table.manage'
  // Analitik & laporan
  | 'analytics.view'
  | 'report.view.full'
  | 'report.view.today'
  | 'target.manage'
  // Master data
  | 'product.view'
  | 'product.manage'
  | 'category.manage'
  | 'price.manage'
  // Inventori
  | 'inventory.view'
  | 'inventory.adjust'
  | 'inventory.opname'
  // Administrasi
  | 'user.manage'
  | 'role.manage'
  | 'settings.manage'
  | 'audit.view'

export interface Role extends BaseEntity {
  name: RoleName
  label: string
  description: string
  permissions: Permission[]
}

export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface User extends BaseEntity {
  name: string
  username: string
  pin: string
  email: string
  phone: string
  role_id: RoleName
  avatar_color: string
  status: UserStatus
  last_login_at: string | null
}

/* ------------------------------- Katalog --------------------------------- */

export interface Category extends BaseEntity {
  name: string
  slug: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

export type ProductStockStatus = 'normal' | 'low' | 'critical' | 'out'

export interface Product extends BaseEntity {
  sku: string
  barcode: string | null
  name: string
  description: string
  category_id: string
  price: number
  cost_price: number
  /** Key ikon pada `lib/glyphs` (mis. 'rice'). Data lama bisa berisi emoji — lihat resolveGlyph. */
  emoji: string
  /** Gradien tailwind untuk latar kartu produk. */
  gradient: string
  is_active: boolean
  track_stock: boolean
  /** Disiapkan untuk fase Recipe/BOM — lihat docs/schema.sql. */
  has_recipe: boolean
  prep_time_minutes: number
}

/* ------------------------------ Inventori -------------------------------- */

export type InventoryUnit = 'pcs' | 'gram' | 'ml' | 'kg' | 'liter' | 'porsi' | 'cup'

export interface Inventory extends BaseEntity {
  product_id: string
  quantity: number
  min_quantity: number
  max_quantity: number
  unit: InventoryUnit
  location: string
  last_stock_in_at: string | null
  last_counted_at: string | null
}

export type StockMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'sales_deduction'
  | 'adjustment'
  | 'opname'
  | 'waste'
  | 'return'

export interface StockMovement extends BaseEntity {
  product_id: string
  type: StockMovementType
  quantity_before: number
  quantity_change: number
  quantity_after: number
  reason: string
  reference_id: string | null
  user_id: string
  user_name: string
}

export type AdjustmentStatus = 'pending' | 'approved' | 'rejected'

export interface StockAdjustment extends BaseEntity {
  product_id: string
  system_quantity: number
  counted_quantity: number
  difference: number
  reason: string
  status: AdjustmentStatus
  requested_by: string
  requested_by_name: string
  approved_by: string | null
}

/* -------------------------------- Order ---------------------------------- */

export type OrderType = 'dine_in' | 'take_away' | 'delivery'

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export interface RestaurantTable extends BaseEntity {
  code: string
  name: string
  capacity: number
  area: string
  status: TableStatus
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  /** Snapshot key ikon saat transaksi dibuat — lihat Product.emoji. */
  emoji: string
  price: number
  cost_price: number
  quantity: number
  discount: number
  note: string
  subtotal: number
}

export interface Order extends BaseEntity {
  order_number: string
  type: OrderType
  status: OrderStatus
  table_id: string | null
  table_name: string | null
  customer_name: string
  guest_count: number
  items: OrderItem[]
  subtotal: number
  discount_amount: number
  discount_note: string
  tax_amount: number
  service_amount: number
  total: number
  note: string
  cashier_id: string
  cashier_name: string
  cancel_reason: string | null
  refund_reason: string | null
  paid_at: string | null
}

/* ------------------------------ Pembayaran ------------------------------- */

export type PaymentMethodCode = 'cash' | 'transfer' | 'qris' | 'card'

export interface PaymentMethod extends BaseEntity {
  code: PaymentMethodCode
  name: string
  description: string
  is_active: boolean
  requires_reference: boolean
  admin_fee_percent: number
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'

export interface Payment extends BaseEntity {
  order_id: string
  method: PaymentMethodCode
  amount: number
  received_amount: number
  change_amount: number
  reference_number: string | null
  status: PaymentStatus
  paid_at: string
}

export interface Invoice extends BaseEntity {
  order_id: string
  invoice_number: string
  issued_at: string
  printed_count: number
}

/* --------------------------- Target Penjualan ---------------------------- */

/**
 * Target bulanan yang ditetapkan owner. `period` memakai format YYYY-MM
 * sehingga satu baris mewakili satu bulan.
 */
export interface SalesTarget extends BaseEntity {
  period: string
  revenue_target: number
  transaction_target: number
  note: string
}

/**
 * `upcoming` untuk bulan yang belum berjalan, `missed` untuk bulan lampau yang
 * tidak tercapai; sisanya hanya berlaku pada bulan berjalan.
 */
export type TargetStatus = 'upcoming' | 'achieved' | 'on_track' | 'at_risk' | 'behind' | 'missed'

/* -------------------------------- Audit ---------------------------------- */

export type AuditAction =
  | 'login'
  | 'logout'
  | 'transaction_created'
  | 'transaction_cancelled'
  | 'refund'
  | 'stock_adjustment'
  | 'price_change'
  | 'permission_change'
  | 'target_updated'
  | 'product_created'
  | 'product_updated'
  | 'user_created'
  | 'user_updated'
  | 'settings_updated'

export interface AuditLog extends BaseEntity {
  user_id: string
  user_name: string
  action: AuditAction
  description: string
  reference_id: string | null
  ip_address: string
}

/* ------------------------------ Pengaturan ------------------------------- */

export interface StoreSettings {
  business_name: string
  tagline: string
  address: string
  phone: string
  email: string
  tax_id: string
  /** Key ikon merek pada `lib/glyphs` (BRAND_GLYPHS). */
  logo_emoji: string
  tax_percent: number
  tax_enabled: boolean
  service_percent: number
  service_enabled: boolean
  currency: string
  receipt_footer: string
  receipt_width: '58mm' | '80mm'
}
