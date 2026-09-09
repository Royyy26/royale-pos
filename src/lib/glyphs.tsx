import type { LucideIcon } from 'lucide-react'
import {
  Apple, Banana, Beef, Beer, Cake, CakeSlice, Candy, Cherry, Citrus, Coffee, Cookie,
  CookingPot, Croissant, CupSoda, Donut, Droplet, EggFried, Fish, GlassWater, Grape,
  IceCreamBowl, IceCreamCone, Leaf, LeafyGreen, Martini, Milk, Nut, Package, Pizza,
  Popcorn, Popsicle, Salad, Sandwich, Snowflake, Soup, Sparkles, Torus, Utensils,
  UtensilsCrossed, Wheat, Wine,
} from 'lucide-react'

/**
 * Registry ikon produk & kategori.
 *
 * Nilai `product.emoji` dan `category.icon` disimpan sebagai *key* teks di sini,
 * bukan karakter emoji: emoji bergantung font, berubah rupa antar sistem operasi,
 * dan tidak bisa diwarnai lewat token tema. Lihat README bagian "Disiplin Ikon".
 */

export type GlyphOption = { key: string; label: string; Icon: LucideIcon }

/** Pilihan ikon untuk kartu produk — dikelompokkan agar picker mudah dipindai. */
export const PRODUCT_GLYPHS: GlyphOption[] = [
  { key: 'rice', label: 'Nasi', Icon: CookingPot },
  { key: 'noodle', label: 'Mie / Soto', Icon: Soup },
  { key: 'chicken', label: 'Ayam', Icon: Beef },
  { key: 'beef', label: 'Daging sapi', Icon: Beef },
  { key: 'fish', label: 'Ikan / seafood', Icon: Fish },
  { key: 'burger', label: 'Burger', Icon: Sandwich },
  { key: 'pasta', label: 'Pasta', Icon: Wheat },
  { key: 'pizza', label: 'Pizza', Icon: Pizza },
  { key: 'fries', label: 'Gorengan', Icon: Popcorn },
  { key: 'salad', label: 'Salad / sayur', Icon: Salad },
  { key: 'egg', label: 'Telur', Icon: EggFried },
  { key: 'chili', label: 'Pedas', Icon: Sparkles },
  { key: 'cheese', label: 'Keju', Icon: Nut },
  { key: 'coffee', label: 'Kopi', Icon: Coffee },
  { key: 'tea', label: 'Teh', Icon: Leaf },
  { key: 'boba', label: 'Boba', Icon: Torus },
  { key: 'juice', label: 'Jus', Icon: CupSoda },
  { key: 'milk', label: 'Susu', Icon: Milk },
  { key: 'water', label: 'Air mineral', Icon: Droplet },
  { key: 'soda', label: 'Soda', Icon: GlassWater },
  { key: 'mocktail', label: 'Mocktail', Icon: Martini },
  { key: 'beer', label: 'Bir', Icon: Beer },
  { key: 'wine', label: 'Wine', Icon: Wine },
  { key: 'ice', label: 'Es batu', Icon: Snowflake },
  { key: 'cake', label: 'Kue', Icon: CakeSlice },
  { key: 'pudding', label: 'Puding', Icon: Cake },
  { key: 'icecream', label: 'Es krim', Icon: IceCreamCone },
  { key: 'gelato', label: 'Gelato', Icon: IceCreamBowl },
  { key: 'popsicle', label: 'Es stik', Icon: Popsicle },
  { key: 'pastry', label: 'Pastry', Icon: Croissant },
  { key: 'cookie', label: 'Kukis', Icon: Cookie },
  { key: 'donut', label: 'Donat', Icon: Donut },
  { key: 'chocolate', label: 'Cokelat', Icon: Candy },
  { key: 'citrus', label: 'Jeruk / lemon', Icon: Citrus },
  { key: 'berry', label: 'Beri', Icon: Grape },
  { key: 'banana', label: 'Pisang', Icon: Banana },
  { key: 'apple', label: 'Apel', Icon: Apple },
  { key: 'cherry', label: 'Ceri', Icon: Cherry },
  { key: 'addon', label: 'Tambahan', Icon: Sparkles },
]

/** Pilihan ikon untuk tab kategori pada halaman POS. */
export const CATEGORY_GLYPHS: GlyphOption[] = [
  { key: 'food', label: 'Makanan', Icon: Utensils },
  { key: 'dining', label: 'Menu utama', Icon: UtensilsCrossed },
  { key: 'drink', label: 'Minuman', Icon: CupSoda },
  { key: 'coffee', label: 'Kopi', Icon: Coffee },
  { key: 'tea', label: 'Teh', Icon: Leaf },
  { key: 'dessert', label: 'Dessert', Icon: CakeSlice },
  { key: 'pastry', label: 'Pastry', Icon: Croissant },
  { key: 'snack', label: 'Camilan', Icon: Popcorn },
  { key: 'salad', label: 'Sehat', Icon: LeafyGreen },
  { key: 'soup', label: 'Berkuah', Icon: Soup },
  { key: 'alcohol', label: 'Beralkohol', Icon: Wine },
  { key: 'addon', label: 'Add On', Icon: Sparkles },
]

/** Pilihan lambang merek toko (StoreSettings.logo_emoji). */
export const BRAND_GLYPHS: GlyphOption[] = [
  { key: 'leaf', label: 'Daun', Icon: Leaf },
  { key: 'coffee', label: 'Cangkir kopi', Icon: Coffee },
  { key: 'dining', label: 'Sendok garpu', Icon: UtensilsCrossed },
  { key: 'cake', label: 'Kue', Icon: CakeSlice },
  { key: 'salad', label: 'Daun segar', Icon: LeafyGreen },
  { key: 'wine', label: 'Gelas wine', Icon: Wine },
]

const BY_KEY: Record<string, LucideIcon> = {}
for (const g of [...PRODUCT_GLYPHS, ...CATEGORY_GLYPHS]) BY_KEY[g.key] ??= g.Icon
/** Lambang merek toko (StoreSettings.logo_emoji). */
BY_KEY.leaf ??= Leaf

/**
 * Emoji dari data lama (localStorage yang sudah terisi sebelum registry ini ada).
 * Dipertahankan agar toko yang sudah jalan tidak kehilangan ikon produknya.
 */
const LEGACY_EMOJI_KEY: Record<string, string> = {
  '\u{1F35B}': 'rice', '\u{1F35A}': 'rice', '\u{1F358}': 'rice', '\u{1F372}': 'noodle', '\u{1F35C}': 'noodle',
  '\u{1F357}': 'chicken', '\u{1F969}': 'beef', '\u{1F354}': 'burger', '\u{1F35D}': 'pasta', '\u{1F35F}': 'fries',
  '\u{1F957}': 'salad', '\u{1F373}': 'egg', '\u{1F336}\u{FE0F}': 'chili', '\u{1F9C0}': 'cheese',
  '\u{1F355}': 'pizza', '\u{1F371}': 'dining', '\u{1F41F}': 'fish',
  '\u{2615}': 'coffee', '\u{1F375}': 'tea', '\u{1F9CB}': 'boba', '\u{1F964}': 'juice', '\u{1F9C9}': 'juice',
  '\u{1F95B}': 'milk', '\u{1F4A7}': 'water', '\u{1F9CA}': 'ice', '\u{1F37E}': 'wine', '\u{1F37A}': 'beer',
  '\u{1F9C3}': 'juice', '\u{1F370}': 'cake', '\u{1F36E}': 'pudding', '\u{1F368}': 'gelato', '\u{1F366}': 'icecream',
  '\u{1F950}': 'pastry', '\u{1F36A}': 'cookie', '\u{1F36B}': 'chocolate', '\u{1F34A}': 'citrus', '\u{1F34B}': 'citrus',
  '\u{1F34C}': 'banana', '\u{1FAD0}': 'berry', '\u{1F37D}\u{FE0F}': 'food', '\u{2795}': 'addon',
  '\u{23F3}': 'addon', '\u{1F4E6}': 'addon', '\u{1F343}': 'leaf',
}

/** Ikon pengganti bila key tidak dikenal - selalu mengembalikan komponen, tidak pernah null. */
export const FALLBACK_GLYPH: LucideIcon = Package

/**
 * Menormalkan nilai tersimpan menjadi key registry.
 * Data lama menyimpan karakter emoji; nilai baru sudah berupa key.
 * Dipakai form agar pilihan yang sedang aktif tetap tersorot.
 */
export function normalizeGlyphKey(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback
  if (BY_KEY[name]) return name
  return LEGACY_EMOJI_KEY[name] ?? fallback
}

export function resolveGlyph(name: string | null | undefined): LucideIcon {
  if (!name) return FALLBACK_GLYPH
  return BY_KEY[name] ?? BY_KEY[LEGACY_EMOJI_KEY[name] ?? ''] ?? FALLBACK_GLYPH
}

export function Glyph({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = resolveGlyph(name)
  return <Icon className={className} aria-hidden="true" />
}
