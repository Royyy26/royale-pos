import type { Permission, Role, RoleName } from '@/types'

/**
 * ============================================================================
 *  RBAC, Role Based Access Control
 *  Sumber tunggal definisi hak akses. Menu, route guard, dan tombol aksi
 *  seluruhnya membaca dari sini sehingga penambahan role baru cukup dilakukan
 *  di satu tempat.
 * ============================================================================
 */

export const ALL_PERMISSIONS: Permission[] = [
  'pos.access',
  'pos.discount',
  'pos.void',
  'pos.refund',
  'order.view.own',
  'order.view.all',
  'table.manage',
  'analytics.view',
  'report.view.full',
  'report.view.today',
  'target.manage',
  'product.view',
  'product.manage',
  'category.manage',
  'price.manage',
  'inventory.view',
  'inventory.adjust',
  'inventory.opname',
  'user.manage',
  'role.manage',
  'settings.manage',
  'audit.view',
]

export const PERMISSION_LABELS: Record<Permission, string> = {
  'pos.access': 'Akses halaman POS',
  'pos.discount': 'Memberi diskon transaksi',
  'pos.void': 'Membatalkan (void) transaksi',
  'pos.refund': 'Melakukan refund',
  'order.view.own': 'Melihat pesanan sendiri',
  'order.view.all': 'Melihat seluruh pesanan',
  'table.manage': 'Mengelola meja & bill terbuka',
  'analytics.view': 'Akses dashboard analitik',
  'report.view.full': 'Laporan seluruh periode',
  'report.view.today': 'Laporan hari ini saja',
  'target.manage': 'Menetapkan target penjualan',
  'product.view': 'Melihat produk',
  'product.manage': 'Mengelola produk',
  'category.manage': 'Mengelola kategori',
  'price.manage': 'Mengubah harga jual',
  'inventory.view': 'Melihat inventori',
  'inventory.adjust': 'Menyesuaikan stok',
  'inventory.opname': 'Melakukan stok opname',
  'user.manage': 'Mengelola pengguna',
  'role.manage': 'Mengelola role & permission',
  'settings.manage': 'Mengubah pengaturan sistem',
  'audit.view': 'Melihat audit log',
}

export const PERMISSION_GROUPS: { label: string; items: Permission[] }[] = [
  { label: 'Transaksi & POS', items: ['pos.access', 'pos.discount', 'pos.void', 'pos.refund', 'table.manage', 'order.view.own', 'order.view.all'] },
  { label: 'Analitik & Laporan', items: ['analytics.view', 'report.view.full', 'report.view.today', 'target.manage'] },
  { label: 'Master Data', items: ['product.view', 'product.manage', 'category.manage', 'price.manage'] },
  { label: 'Inventori', items: ['inventory.view', 'inventory.adjust', 'inventory.opname'] },
  { label: 'Administrasi', items: ['user.manage', 'role.manage', 'settings.manage', 'audit.view'] },
]

/**
 * Kasir dibatasi pada operasional input pesanan. Diskon, refund, laporan
 * lintas periode, dan seluruh pengaturan tetap menjadi wewenang owner.
 */
const KASIR_PERMISSIONS: Permission[] = [
  'pos.access',
  'pos.void',
  'table.manage',
  'order.view.own',
  'report.view.today',
  'product.view',
]

const WAREHOUSE_PERMISSIONS: Permission[] = [
  'product.view',
  'inventory.view',
  'inventory.adjust',
  'inventory.opname',
]

const OWNER_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS]

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  owner: OWNER_PERMISSIONS,
  kasir: KASIR_PERMISSIONS,
  warehouse: WAREHOUSE_PERMISSIONS,
}

export const ROLE_META: Record<RoleName, { label: string; description: string; color: string; badge: string }> = {
  owner: {
    label: 'Owner',
    description: 'Akses penuh terhadap seluruh sistem, analitik bisnis, dan pengaturan.',
    color: 'from-plum-500 to-plum-700',
    badge: 'bg-plum-50 text-plum-700 ring-plum-200',
  },
  kasir: {
    label: 'Kasir',
    description: 'Input pesanan, pembayaran, dan rekap penjualan hari ini.',
    color: 'from-brand-400 to-brand-600',
    badge: 'bg-brand-50 text-brand-800 ring-brand-200',
  },
  warehouse: {
    label: 'Warehouse',
    description: 'Pengelolaan persediaan, penyesuaian stok, dan stok opname.',
    color: 'from-warning-500 to-warning-700',
    badge: 'bg-warning-50 text-warning-700 ring-warning-200',
  },
}

export function buildRoles(now: string): Role[] {
  return (Object.keys(ROLE_PERMISSIONS) as RoleName[]).map((name) => ({
    id: name,
    name,
    label: ROLE_META[name].label,
    description: ROLE_META[name].description,
    permissions: ROLE_PERMISSIONS[name],
    created_at: now,
    updated_at: now,
  }))
}

export function can(permissions: Permission[] | undefined, required: Permission | Permission[]): boolean {
  if (!permissions) return false
  const list = Array.isArray(required) ? required : [required]
  return list.some((p) => permissions.includes(p))
}

export function canAll(permissions: Permission[] | undefined, required: Permission[]): boolean {
  if (!permissions) return false
  return required.every((p) => permissions.includes(p))
}
