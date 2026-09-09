import type {
  AdjustmentStatus,
  AuditAction,
  OrderStatus,
  OrderType,
  PaymentMethodCode,
  ProductStockStatus,
  StockMovementType,
  TableStatus,
} from '@/types'
import {
  Banknote,
  Bike,
  CreditCard,
  Landmark,
  QrCode,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/primitives'

/* ------------------------------ Status order ----------------------------- */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  paid: 'Dibayar',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  refunded: 'Refund',
}

const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  draft: 'neutral',
  pending: 'warning',
  confirmed: 'info',
  paid: 'brand',
  completed: 'success',
  cancelled: 'danger',
  refunded: 'violet',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} dot>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  )
}

/* ------------------------------- Tipe order ------------------------------ */

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: 'Dine In',
  take_away: 'Take Away',
  delivery: 'Delivery',
}

/** Ikon vektor, bukan emoji — emoji bergantung font dan tidak bisa diberi token warna. */
export const ORDER_TYPE_ICON: Record<OrderType, LucideIcon> = {
  dine_in: Utensils,
  take_away: ShoppingBag,
  delivery: Bike,
}

export function OrderTypeBadge({ type }: { type: OrderType }) {
  const tone: Record<OrderType, BadgeTone> = { dine_in: 'brand', take_away: 'amber', delivery: 'info' }
  const Icon = ORDER_TYPE_ICON[type]
  return (
    <Badge tone={tone[type]}>
      {/* Dekoratif: labelnya sudah menyebutkan hal yang sama. */}
      <Icon className="h-3 w-3" aria-hidden="true" />
      {ORDER_TYPE_LABEL[type]}
    </Badge>
  )
}

/* --------------------------- Metode pembayaran --------------------------- */

export const PAYMENT_LABEL: Record<PaymentMethodCode, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  card: 'Kartu',
}

export const PAYMENT_ICON: Record<PaymentMethodCode, LucideIcon> = {
  cash: Banknote,
  transfer: Landmark,
  qris: QrCode,
  card: CreditCard,
}

export const PAYMENT_COLOR: Record<PaymentMethodCode, string> = {
  cash: '#4A9366',
  qris: '#7C4D77',
  transfer: '#C2703A',
  card: '#4A5FA5',
}

export function PaymentBadge({ method }: { method: PaymentMethodCode }) {
  const tone: Record<PaymentMethodCode, BadgeTone> = {
    cash: 'success',
    transfer: 'warning',
    qris: 'violet',
    card: 'info',
  }
  const Icon = PAYMENT_ICON[method]
  return (
    <Badge tone={tone[method]}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PAYMENT_LABEL[method]}
    </Badge>
  )
}

/* -------------------------------- Stok ----------------------------------- */

export const STOCK_STATUS_LABEL: Record<ProductStockStatus, string> = {
  normal: 'Stok Normal',
  low: 'Stok Rendah',
  critical: 'Stok Kritis',
  out: 'Stok Habis',
}

const STOCK_STATUS_TONE: Record<ProductStockStatus, BadgeTone> = {
  normal: 'success',
  low: 'warning',
  critical: 'amber',
  out: 'danger',
}

export function stockStatusOf(quantity: number, min: number): ProductStockStatus {
  if (quantity <= 0) return 'out'
  if (quantity <= min * 0.5) return 'critical'
  if (quantity <= min) return 'low'
  return 'normal'
}

export function StockStatusBadge({ status }: { status: ProductStockStatus }) {
  return (
    <Badge tone={STOCK_STATUS_TONE[status]} dot>
      {STOCK_STATUS_LABEL[status]}
    </Badge>
  )
}

/* --------------------------- Pergerakan stok ----------------------------- */

export const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  stock_in: 'Stok Masuk',
  stock_out: 'Stok Keluar',
  sales_deduction: 'Penjualan',
  adjustment: 'Penyesuaian',
  opname: 'Stok Opname',
  waste: 'Waste / Rusak',
  return: 'Pengembalian',
}

const MOVEMENT_TONE: Record<StockMovementType, BadgeTone> = {
  stock_in: 'success',
  stock_out: 'warning',
  sales_deduction: 'info',
  adjustment: 'violet',
  opname: 'brand',
  waste: 'danger',
  return: 'neutral',
}

export function MovementBadge({ type }: { type: StockMovementType }) {
  return <Badge tone={MOVEMENT_TONE[type]}>{MOVEMENT_LABEL[type]}</Badge>
}

/* ------------------------------ Status meja ------------------------------ */

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  reserved: 'Dipesan',
  cleaning: 'Dibersihkan',
}

export const TABLE_STATUS_TONE: Record<TableStatus, BadgeTone> = {
  available: 'success',
  occupied: 'danger',
  reserved: 'warning',
  cleaning: 'neutral',
}

/* -------------------------- Penyesuaian stok ----------------------------- */

export const ADJUSTMENT_LABEL: Record<AdjustmentStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

const ADJUSTMENT_TONE: Record<AdjustmentStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export function AdjustmentBadge({ status }: { status: AdjustmentStatus }) {
  return <Badge tone={ADJUSTMENT_TONE[status]} dot>{ADJUSTMENT_LABEL[status]}</Badge>
}

/* -------------------------------- Audit ---------------------------------- */

export const AUDIT_LABEL: Record<AuditAction, string> = {
  login: 'Login',
  logout: 'Logout',
  transaction_created: 'Transaksi Dibuat',
  transaction_cancelled: 'Transaksi Dibatalkan',
  refund: 'Refund',
  stock_adjustment: 'Penyesuaian Stok',
  price_change: 'Perubahan Harga',
  permission_change: 'Perubahan Hak Akses',
  target_updated: 'Target Diperbarui',
  product_created: 'Produk Ditambahkan',
  product_updated: 'Produk Diperbarui',
  user_created: 'Pengguna Ditambahkan',
  user_updated: 'Pengguna Diperbarui',
  settings_updated: 'Pengaturan Diperbarui',
}

export const AUDIT_TONE: Record<AuditAction, BadgeTone> = {
  login: 'neutral',
  logout: 'neutral',
  transaction_created: 'success',
  transaction_cancelled: 'danger',
  refund: 'violet',
  stock_adjustment: 'amber',
  price_change: 'warning',
  permission_change: 'info',
  target_updated: 'brand',
  product_created: 'success',
  product_updated: 'info',
  user_created: 'success',
  user_updated: 'info',
  settings_updated: 'neutral',
}
