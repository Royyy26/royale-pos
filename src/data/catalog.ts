import type { Category, PaymentMethod, Product, RestaurantTable, StoreSettings, User } from '@/types'

const NOW = new Date().toISOString()

const base = (id: string) => ({ id, created_at: NOW, updated_at: NOW })

/* ------------------------------ Pengaturan ------------------------------- */

export const DEFAULT_SETTINGS: StoreSettings = {
  business_name: 'Royale Coffee & Kitchen',
  tagline: 'Kopi, Dapur, dan Cerita',
  address: 'Jl. Diponegoro No. 128, Bandung, Jawa Barat 40115',
  phone: '022-8765 4321',
  email: 'halo@royale.id',
  tax_id: '01.234.567.8-901.000',
  logo_emoji: 'leaf',
  tax_percent: 11,
  tax_enabled: true,
  service_percent: 5,
  service_enabled: true,
  currency: 'IDR',
  receipt_footer: 'Terima kasih atas kunjungan Anda!\nSampai jumpa kembali di Royale.',
  receipt_width: '80mm',
}

/* --------------------------- Target Penjualan ---------------------------- */

/** Target omzet & jumlah transaksi per bulan (dipakai generator seed). */
export const DEFAULT_MONTHLY_REVENUE_TARGET = 200_000_000
export const DEFAULT_MONTHLY_TRANSACTION_TARGET = 1_200

/* -------------------------------- Kategori ------------------------------- */

export const CATEGORIES: Category[] = [
  { ...base('cat_food'), name: 'Makanan', slug: 'food', icon: 'food', color: 'amber', sort_order: 1, is_active: true },
  { ...base('cat_beverage'), name: 'Minuman', slug: 'beverage', icon: 'drink', color: 'sky', sort_order: 2, is_active: true },
  { ...base('cat_coffee'), name: 'Kopi', slug: 'coffee', icon: 'coffee', color: 'orange', sort_order: 3, is_active: true },
  { ...base('cat_dessert'), name: 'Dessert', slug: 'dessert', icon: 'dessert', color: 'pink', sort_order: 4, is_active: true },
  { ...base('cat_addon'), name: 'Add On', slug: 'addon', icon: 'addon', color: 'slate', sort_order: 5, is_active: true },
]

/* -------------------------------- Produk --------------------------------- */

type Seed = [string, string, string, number, number, string, string, number]
// [id, sku, nama, harga, hpp, glyph (key di lib/glyphs), gradient, prep]

const FOOD: Seed[] = [
  ['p01', 'FD-001', 'Nasi Goreng Kampung', 38000, 15200, 'rice', 'from-amber-100 to-orange-200', 12],
  ['p02', 'FD-002', 'Mie Goreng Jawa', 35000, 13500, 'noodle', 'from-yellow-100 to-amber-200', 11],
  ['p03', 'FD-003', 'Ayam Bakar Madu', 48000, 21000, 'chicken', 'from-orange-100 to-red-200', 18],
  ['p04', 'FD-004', 'Ayam Geprek Sambal Ijo', 42000, 17000, 'chili', 'from-red-100 to-rose-200', 14],
  ['p05', 'FD-005', 'Sapi Lada Hitam', 62000, 29000, 'beef', 'from-stone-100 to-amber-200', 20],
  ['p06', 'FD-006', 'Spaghetti Aglio Olio', 45000, 17500, 'pasta', 'from-lime-100 to-green-200', 15],
  ['p07', 'FD-007', 'Chicken Katsu Curry', 52000, 23000, 'rice', 'from-yellow-100 to-orange-200', 16],
  ['p08', 'FD-008', 'Beef Burger Royale', 58000, 26500, 'burger', 'from-amber-100 to-yellow-200', 14],
  ['p09', 'FD-009', 'Nasi Ayam Rica-Rica', 44000, 18200, 'rice', 'from-red-100 to-orange-200', 15],
  ['p10', 'FD-010', 'Soto Ayam Bening', 32000, 12000, 'noodle', 'from-yellow-100 to-lime-200', 10],
  ['p11', 'FD-011', 'Gado-Gado Spesial', 30000, 11000, 'salad', 'from-green-100 to-emerald-200', 9],
  ['p12', 'FD-012', 'Kentang Goreng Truffle', 35000, 12500, 'fries', 'from-amber-100 to-yellow-200', 8],
]

const BEVERAGE: Seed[] = [
  ['p13', 'BV-001', 'Es Teh Manis', 12000, 3000, 'boba', 'from-amber-100 to-yellow-200', 3],
  ['p14', 'BV-002', 'Lemon Tea Segar', 20000, 6000, 'citrus', 'from-yellow-100 to-lime-200', 4],
  ['p15', 'BV-003', 'Thai Tea Original', 25000, 8500, 'juice', 'from-orange-100 to-amber-200', 4],
  ['p16', 'BV-004', 'Matcha Latte Ice', 32000, 12000, 'tea', 'from-green-100 to-emerald-200', 5],
  ['p17', 'BV-005', 'Chocolate Milkshake', 35000, 13000, 'milk', 'from-amber-100 to-stone-200', 6],
  ['p18', 'BV-006', 'Air Mineral 600ml', 8000, 2800, 'water', 'from-sky-100 to-blue-200', 1],
  ['p19', 'BV-007', 'Fresh Orange Juice', 28000, 10500, 'citrus', 'from-orange-100 to-amber-200', 5],
  ['p20', 'BV-008', 'Infused Water Berry', 22000, 7000, 'berry', 'from-purple-100 to-fuchsia-200', 4],
  ['p21', 'BV-009', 'Soda Gembira', 26000, 9000, 'juice', 'from-pink-100 to-rose-200', 4],
]

const COFFEE: Seed[] = [
  ['p22', 'CF-001', 'Espresso Single', 20000, 6200, 'coffee', 'from-stone-200 to-amber-300', 3],
  ['p23', 'CF-002', 'Americano Ice', 25000, 7500, 'ice', 'from-stone-100 to-stone-300', 4],
  ['p24', 'CF-003', 'Cappuccino', 30000, 10000, 'coffee', 'from-amber-100 to-orange-200', 5],
  ['p25', 'CF-004', 'Caffe Latte', 32000, 11000, 'milk', 'from-amber-100 to-stone-200', 5],
  ['p26', 'CF-005', 'Kopi Susu Royale', 26000, 8000, 'juice', 'from-amber-200 to-orange-300', 4],
  ['p27', 'CF-006', 'Caramel Macchiato', 38000, 14000, 'pudding', 'from-amber-100 to-yellow-200', 6],
  ['p28', 'CF-007', 'Vanilla Sweet Latte', 36000, 13000, 'icecream', 'from-yellow-100 to-amber-200', 6],
  ['p29', 'CF-008', 'Manual Brew V60', 35000, 12000, 'addon', 'from-stone-100 to-amber-200', 8],
  ['p30', 'CF-009', 'Cold Brew Bottle', 40000, 14500, 'wine', 'from-stone-200 to-slate-300', 3],
]

const DESSERT: Seed[] = [
  ['p31', 'DS-001', 'Basque Burnt Cheesecake', 42000, 16000, 'cake', 'from-amber-100 to-orange-200', 3],
  ['p32', 'DS-002', 'Tiramisu Cup', 38000, 14000, 'pudding', 'from-stone-100 to-amber-200', 3],
  ['p33', 'DS-003', 'Choco Lava Cake', 40000, 15000, 'chocolate', 'from-amber-200 to-stone-300', 8],
  ['p34', 'DS-004', 'Pisang Goreng Keju', 28000, 9500, 'banana', 'from-yellow-100 to-amber-200', 9],
  ['p35', 'DS-005', 'Es Krim Vanilla Scoop', 22000, 7000, 'gelato', 'from-yellow-50 to-amber-100', 2],
  ['p36', 'DS-006', 'Croissant Butter', 26000, 9000, 'pastry', 'from-amber-100 to-yellow-200', 3],
]

const ADDON: Seed[] = [
  ['p37', 'AD-001', 'Extra Shot Espresso', 8000, 2500, 'addon', 'from-stone-100 to-stone-200', 1],
  ['p38', 'AD-002', 'Extra Keju', 10000, 3500, 'cheese', 'from-yellow-100 to-amber-200', 1],
  ['p39', 'AD-003', 'Extra Telur Mata Sapi', 8000, 2800, 'egg', 'from-yellow-100 to-orange-200', 3],
  ['p40', 'AD-004', 'Nasi Putih Tambah', 6000, 1800, 'rice', 'from-slate-100 to-stone-200', 2],
  ['p41', 'AD-005', 'Sambal Matah', 7000, 2200, 'chili', 'from-red-100 to-rose-200', 2],
  ['p42', 'AD-006', 'Kerupuk Udang', 5000, 1500, 'rice', 'from-amber-100 to-yellow-200', 1],
]

/**
 * Latar kartu produk ditentukan per kategori, bukan per produk. Grid menu jadi
 * tenang dan tetap mudah dipindai — bukan pelangi pastel seperti sebelumnya.
 */
const CATEGORY_GRADIENT: Record<string, string> = {
  cat_food: 'from-brand-100 to-brand-200/80',
  cat_beverage: 'from-info-50 to-info-100',
  cat_coffee: 'from-ink-150 to-brand-100',
  cat_dessert: 'from-plum-50 to-plum-100',
  cat_addon: 'from-ink-100 to-ink-150',
}

function toProducts(seeds: Seed[], categoryId: string, trackStock = true): Product[] {
  // Kolom gradien pada tuple sengaja diabaikan; lihat CATEGORY_GRADIENT.
  return seeds.map(([id, sku, name, price, cost, emoji, , prep]) => ({
    ...base(id),
    sku,
    barcode: `899${sku.replace(/\D/g, '').padStart(10, '0')}`,
    name,
    description: `${name} — disajikan hangat dengan bahan pilihan.`,
    category_id: categoryId,
    price,
    cost_price: cost,
    emoji,
    gradient: CATEGORY_GRADIENT[categoryId] ?? 'from-ink-100 to-ink-150',
    is_active: true,
    track_stock: trackStock,
    has_recipe: false,
    prep_time_minutes: prep,
  }))
}

export const PRODUCTS: Product[] = [
  ...toProducts(FOOD, 'cat_food'),
  ...toProducts(BEVERAGE, 'cat_beverage'),
  ...toProducts(COFFEE, 'cat_coffee'),
  ...toProducts(DESSERT, 'cat_dessert'),
  ...toProducts(ADDON, 'cat_addon'),
]

/* ------------------------------- Pengguna -------------------------------- */

/** Satu akun kasir saja — sesuai operasional gerai tunggal. */
export const USERS: User[] = [
  {
    ...base('u_owner'),
    name: 'Elroy Matthew',
    username: 'owner',
    pin: '1234',
    email: 'owner@royale.id',
    phone: '0812-1000-0001',
    role_id: 'owner',
    avatar_color: 'from-plum-500 to-plum-700',
    status: 'active',
    last_login_at: null,
  },
  {
    ...base('u_kasir1'),
    name: 'Dinda Pratiwi',
    username: 'kasir',
    pin: '1234',
    email: 'dinda@royale.id',
    phone: '0812-1000-0002',
    role_id: 'kasir',
    avatar_color: 'from-brand-400 to-brand-600',
    status: 'active',
    last_login_at: null,
  },
  {
    ...base('u_wh'),
    name: 'Rizky Ramadhan',
    username: 'gudang',
    pin: '1234',
    email: 'rizky@royale.id',
    phone: '0812-1000-0005',
    role_id: 'warehouse',
    avatar_color: 'from-warning-500 to-warning-700',
    status: 'active',
    last_login_at: null,
  },
]

/* --------------------------------- Meja ---------------------------------- */

const TABLE_SEEDS: [string, number, string][] = [
  ['A1', 2, 'Indoor'], ['A2', 2, 'Indoor'], ['A3', 4, 'Indoor'], ['A4', 4, 'Indoor'],
  ['A5', 4, 'Indoor'], ['A6', 6, 'Indoor'], ['B1', 2, 'Outdoor'], ['B2', 2, 'Outdoor'],
  ['B3', 4, 'Outdoor'], ['B4', 4, 'Outdoor'], ['C1', 8, 'VIP Room'], ['C2', 10, 'VIP Room'],
]

export const TABLES: RestaurantTable[] = TABLE_SEEDS.map(([code, capacity, area], i) => ({
  ...base(`tbl_${code.toLowerCase()}`),
  code,
  name: `Meja ${code}`,
  capacity,
  area,
  status: i === 2 || i === 7 ? 'occupied' : i === 10 ? 'reserved' : 'available',
}))

/* --------------------------- Metode Pembayaran --------------------------- */

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    ...base('pm_cash'),
    code: 'cash',
    name: 'Tunai',
    description: 'Pembayaran uang tunai di kasir',
    is_active: true,
    requires_reference: false,
    admin_fee_percent: 0,
  },
  {
    ...base('pm_qris'),
    code: 'qris',
    name: 'QRIS',
    description: 'Scan QR — semua e-wallet & mobile banking',
    is_active: true,
    requires_reference: true,
    admin_fee_percent: 0.7,
  },
  {
    ...base('pm_transfer'),
    code: 'transfer',
    name: 'Transfer Bank',
    description: 'BCA 1234567890 a/n Royale Coffee',
    is_active: true,
    requires_reference: true,
    admin_fee_percent: 0,
  },
  {
    ...base('pm_card'),
    code: 'card',
    name: 'Kartu Debit / Kredit',
    description: 'EDC Visa, Mastercard, GPN',
    is_active: true,
    requires_reference: true,
    admin_fee_percent: 2,
  },
]
