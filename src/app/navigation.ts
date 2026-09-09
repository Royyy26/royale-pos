import {
  Archive,
  BarChart3,
  Boxes,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  ListOrdered,
  PackageSearch,
  ScrollText,
  Settings,
  ShoppingCart,
  Table2,
  Tags,
  Target,
  TrendingUp,
  UserCog,
  Users,
  Warehouse,
} from 'lucide-react'
import type { Permission, RoleName } from '@/types'

export interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  permission?: Permission | Permission[]
  roles?: RoleName[]
  badgeKey?: 'pendingAdjustments' | 'lowStock' | 'openBills'
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Struktur menu per role. Setiap item tetap divalidasi ulang oleh permission,
 * sehingga perubahan hak akses pada halaman Role langsung tercermin di sidebar.
 */
export const NAVIGATION: Record<RoleName, NavGroup[]> = {
  kasir: [
    {
      label: 'Operasional',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
        { label: 'Kasir / POS', to: '/pos', icon: ShoppingCart, permission: 'pos.access' },
        { label: 'Denah Meja', to: '/tables', icon: Table2, permission: 'table.manage', badgeKey: 'openBills' },
        { label: 'Pesanan Saya', to: '/orders', icon: ListOrdered, permission: ['order.view.own', 'order.view.all'] },
        { label: 'Penjualan Hari Ini', to: '/today-sales', icon: TrendingUp, permission: 'report.view.today' },
      ],
    },
  ],

  owner: [
    {
      label: 'Ikhtisar',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
        { label: 'Analitik Bisnis', to: '/analytics', icon: BarChart3, permission: 'analytics.view' },
        { label: 'Target & KPI', to: '/targets', icon: Target, permission: 'target.manage' },
        { label: 'Laporan', to: '/reports', icon: FileBarChart, permission: 'report.view.full' },
      ],
    },
    {
      label: 'Operasional',
      items: [
        { label: 'Kasir / POS', to: '/pos', icon: ShoppingCart, permission: 'pos.access' },
        { label: 'Denah Meja', to: '/tables', icon: Table2, permission: 'table.manage', badgeKey: 'openBills' },
        { label: 'Pesanan', to: '/orders', icon: ListOrdered, permission: 'order.view.all' },
        { label: 'Rekap Harian', to: '/daily-recap', icon: CalendarRange, permission: ['report.view.full', 'report.view.today'] },
      ],
    },
    {
      label: 'Katalog & Stok',
      items: [
        { label: 'Produk', to: '/products', icon: Boxes, permission: 'product.manage' },
        { label: 'Kategori', to: '/categories', icon: Tags, permission: 'category.manage' },
        { label: 'Inventori', to: '/inventory', icon: Warehouse, permission: 'inventory.view', badgeKey: 'lowStock' },
        { label: 'Pergerakan Stok', to: '/stock-movement', icon: Archive, permission: 'inventory.view' },
        { label: 'Penyesuaian Stok', to: '/stock-adjustment', icon: ClipboardCheck, permission: 'inventory.adjust', badgeKey: 'pendingAdjustments' },
      ],
    },
    {
      label: 'Administrasi',
      items: [
        { label: 'Pengguna', to: '/users', icon: Users, permission: 'user.manage' },
        { label: 'Role & Hak Akses', to: '/roles', icon: UserCog, permission: 'role.manage' },
        { label: 'Audit Log', to: '/audit', icon: ScrollText, permission: 'audit.view' },
        { label: 'Pengaturan', to: '/settings', icon: Settings, permission: 'settings.manage' },
      ],
    },
  ],

  warehouse: [
    {
      label: 'Gudang',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
        { label: 'Inventori', to: '/inventory', icon: Warehouse, permission: 'inventory.view', badgeKey: 'lowStock' },
        { label: 'Produk', to: '/products-view', icon: PackageSearch, permission: 'product.view' },
      ],
    },
    {
      label: 'Aktivitas Stok',
      items: [
        { label: 'Pergerakan Stok', to: '/stock-movement', icon: Archive, permission: 'inventory.view' },
        { label: 'Penyesuaian Stok', to: '/stock-adjustment', icon: ClipboardCheck, permission: 'inventory.adjust', badgeKey: 'pendingAdjustments' },
        { label: 'Stok Opname', to: '/stock-opname', icon: ClipboardList, permission: 'inventory.opname' },
      ],
    },
  ],
}

/** Halaman awal setelah login untuk masing-masing role. */
export const HOME_ROUTE: Record<RoleName, string> = {
  kasir: '/pos',
  owner: '/dashboard',
  warehouse: '/dashboard',
}
