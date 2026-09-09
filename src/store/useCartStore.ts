import { create } from 'zustand'
import { uid } from '@/lib/utils'
import type { Order, OrderItem, OrderType, Product, StoreSettings } from '@/types'

export interface CartTotals {
  itemCount: number
  lineCount: number
  subtotal: number
  discountAmount: number
  serviceAmount: number
  taxAmount: number
  total: number
}

export type DiscountMode = 'none' | 'percent' | 'amount'

interface CartState {
  /** Bill terbuka yang sedang diedit; null berarti pesanan baru. */
  activeBillId: string | null
  items: OrderItem[]
  orderType: OrderType
  tableId: string | null
  tableName: string | null
  customerName: string
  guestCount: number
  note: string
  discountMode: DiscountMode
  discountValue: number
  discountNote: string

  add: (product: Product, quantity?: number) => void
  increase: (itemId: string) => void
  decrease: (itemId: string) => void
  setQuantity: (itemId: string, quantity: number) => void
  remove: (itemId: string) => void
  setItemNote: (itemId: string, note: string) => void
  clear: () => void

  setOrderType: (type: OrderType) => void
  setTable: (id: string | null, name: string | null) => void
  setCustomerName: (name: string) => void
  setGuestCount: (count: number) => void
  setNote: (note: string) => void
  setDiscount: (mode: DiscountMode, value: number, note: string) => void

  /**
   * Muat isi bill terbuka ke keranjang untuk dilanjutkan.
   *
   * `mergeCurrentItems` menyatukan isi keranjang yang sedang berjalan ke dalam
   * bill. Wajib dipakai saat kasir memilih meja setelah terlanjur memasukkan
   * menu — tanpa itu item yang sudah diketik hilang tanpa peringatan.
   */
  loadBill: (order: Order, mergeCurrentItems?: boolean) => void

  totals: (settings: StoreSettings) => CartTotals
}

const initial = {
  activeBillId: null as string | null,
  items: [] as OrderItem[],
  orderType: 'dine_in' as OrderType,
  tableId: null as string | null,
  tableName: null as string | null,
  customerName: '',
  guestCount: 1,
  note: '',
  discountMode: 'none' as DiscountMode,
  discountValue: 0,
  discountNote: '',
}

export const useCartStore = create<CartState>((set, get) => ({
  ...initial,

  add: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === product.id && !i.note)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * i.price }
              : i,
          ),
        }
      }
      const item: OrderItem = {
        id: uid('ci'),
        order_id: '',
        product_id: product.id,
        product_name: product.name,
        emoji: product.emoji,
        price: product.price,
        cost_price: product.cost_price,
        quantity,
        discount: 0,
        note: '',
        subtotal: product.price * quantity,
      }
      return { items: [...state.items, item] }
    }),

  increase: (itemId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i,
      ),
    })),

  decrease: (itemId) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1, subtotal: (i.quantity - 1) * i.price } : i))
        .filter((i) => i.quantity > 0),
    })),

  setQuantity: (itemId, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === itemId ? { ...i, quantity, subtotal: quantity * i.price } : i))
        .filter((i) => i.quantity > 0),
    })),

  remove: (itemId) => set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

  setItemNote: (itemId, note) =>
    set((state) => ({ items: state.items.map((i) => (i.id === itemId ? { ...i, note } : i)) })),

  clear: () => set({ ...initial }),

  setOrderType: (orderType) =>
    set((state) => ({
      orderType,
      tableId: orderType === 'dine_in' ? state.tableId : null,
      tableName: orderType === 'dine_in' ? state.tableName : null,
    })),
  setTable: (tableId, tableName) => set({ tableId, tableName }),
  setCustomerName: (customerName) => set({ customerName }),
  setGuestCount: (guestCount) => set({ guestCount: Math.max(1, guestCount) }),
  setNote: (note) => set({ note }),
  setDiscount: (discountMode, discountValue, discountNote) => set({ discountMode, discountValue, discountNote }),

  loadBill: (order, mergeCurrentItems = false) =>
    set((state) => ({
      activeBillId: order.id,
      items: mergeCurrentItems
        ? state.items.reduce<OrderItem[]>(
            (acc, cur) => {
              const same = acc.find((i) => i.product_id === cur.product_id && (i.note || '') === (cur.note || ''))
              if (same) {
                same.quantity += cur.quantity
                same.subtotal = same.quantity * same.price
                return acc
              }
              return [...acc, { ...cur, id: uid('ci') }]
            },
            order.items.map((it) => ({ ...it })),
          )
        : order.items.map((it) => ({ ...it })),
      orderType: order.type,
      tableId: order.table_id,
      tableName: order.table_name,
      customerName: order.customer_name,
      guestCount: order.guest_count,
      note: order.note,
      // Diskon disimpan sebagai nominal agar nilainya persis seperti pada bill.
      discountMode: order.discount_amount > 0 ? ('amount' as DiscountMode) : ('none' as DiscountMode),
      discountValue: order.discount_amount,
      discountNote: order.discount_note,
    })),

  totals: (settings) => {
    const { items, discountMode, discountValue, orderType } = get()
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0)

    let discountAmount = 0
    if (discountMode === 'percent') discountAmount = Math.round((subtotal * Math.min(discountValue, 100)) / 100)
    else if (discountMode === 'amount') discountAmount = Math.min(discountValue, subtotal)

    const afterDiscount = Math.max(0, subtotal - discountAmount)
    const serviceAmount =
      settings.service_enabled && orderType === 'dine_in'
        ? Math.round((afterDiscount * settings.service_percent) / 100)
        : 0
    const taxAmount = settings.tax_enabled
      ? Math.round(((afterDiscount + serviceAmount) * settings.tax_percent) / 100)
      : 0

    return {
      itemCount: items.reduce((a, i) => a + i.quantity, 0),
      lineCount: items.length,
      subtotal,
      discountAmount,
      serviceAmount,
      taxAmount,
      total: afterDiscount + serviceAmount + taxAmount,
    }
  },
}))
